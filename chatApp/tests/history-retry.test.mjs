import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../account.html', import.meta.url), 'utf8');
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(match => match[1]).find(value => value.includes('async function loadAllExistingMessages()'));
const account = '0x' + '1'.repeat(40);
const contact = '0x' + '2'.repeat(40);
const event = (block = 50) => ({
    blockNumber: block, transactionHash: `fixture-${block}`,
    returnValues: {from: account, to: contact, message: 'hello', timestamp: 'fixture'},
});

function harness({failures = 0, headFailures = 0, batches = [[]], gate} = {}) {
    const requests = [], timers = [], elements = new Map();
    let head = 100, historyCalls = 0;
    const contract = {async getPastEvents(name, range) {
        requests.push({name, ...range});
        const call = historyCalls++;
        if (gate && call === 0) await gate;
        if (call < failures) throw new Error('fixture: history unavailable');
        return batches[Math.min(call, batches.length - 1)];
    }};
    function Web3() {
        this.eth = {
            Contract: function () { return contract; },
            net: {isListening: async () => true},
            getAccounts: async () => [account, contact],
            getBlockNumber: async () => {
                if (headFailures-- > 0) throw new Error('fixture: head unavailable');
                return head++;
            },
        };
    }
    const element = id => {
        if (!elements.has(id)) elements.set(id, {
            hidden: id === 'historyStatus', disabled: false, textContent: '', innerHTML: '',
        });
        return elements.get(id);
    };
    const context = vm.createContext({
        Web3, localStorage: {getItem: () => account},
        window: {addEventListener() {}, location: {}},
        document: {getElementById: element},
        console: {log() {}, error() {}}, alert() {},
        setInterval: fn => {timers.push(fn); return timers.length;},
    });
    vm.runInContext(script, context, {timeout: 1000});
    return {
        requests, timers, element,
        run: expression => vm.runInContext(expression, context, {timeout: 1000}),
        messages: () => JSON.parse(vm.runInContext('JSON.stringify([...messageStore.values()].flat())', context)),
    };
}

const range = (fromBlock, toBlock) => ({name: 'message', fromBlock, toBlock});

test('successful history anchors polling to the last actually loaded block', async () => {
    const h = harness();
    await h.run('initializeApp()');
    assert.equal(h.timers.length, 1);
    await h.timers[0]();
    assert.deepEqual(h.requests, [range(0, 100), range(101, 101)]);
    assert.equal(h.element('historyStatus').hidden, true);
});

test('history error is visible; retry fills the original window before polling', async () => {
    const h = harness({failures: 1, batches: [[], [event()]]});
    await h.run('initializeApp()');
    assert.equal(h.timers.length, 0);
    assert.equal(h.element('historyStatus').hidden, false);
    assert.match(h.element('historyMessage').textContent, /history unavailable/i);
    assert.equal(h.element('retryHistory').disabled, false);
    await h.run('retryMessageHistory()');
    assert.deepEqual(h.requests, [range(0, 100), range(0, 100)]);
    assert.equal(h.messages().length, 1);
    assert.equal(h.element('historyStatus').hidden, true);
    assert.equal(h.timers.length, 1);
    await h.timers[0]();
    assert.deepEqual(h.requests[2], range(101, 101));
});

test('repeated failures keep the gap and never start a checker', async () => {
    const h = harness({failures: 2});
    await h.run('initializeApp()');
    await h.run('retryMessageHistory()');
    assert.deepEqual(h.requests, [range(0, 100), range(0, 100)]);
    assert.equal(h.timers.length, 0);
    assert.equal(h.element('historyStatus').hidden, false);
});

test('head lookup failure can be retried without inventing a covered range', async () => {
    const h = harness({headFailures: 1});
    await h.run('initializeApp()');
    assert.equal(h.requests.length, 0);
    assert.equal(h.timers.length, 0);
    assert.equal(h.element('historyStatus').hidden, false);
    await h.run('retryMessageHistory()');
    assert.deepEqual(h.requests, [range(0, 100)]);
    assert.equal(h.timers.length, 1);
});

test('failed decoding cannot leave partial messages to duplicate on retry', async () => {
    const h = harness({batches: [[event(), {returnValues: null}], [event()]]});
    await h.run('initializeApp()');
    assert.equal(h.messages().length, 0);
    assert.equal(h.timers.length, 0);
    await h.run('retryMessageHistory()');
    assert.equal(h.messages().length, 1);
    assert.equal(h.timers.length, 1);
});

test('in-flight retries are ignored and a completed retry cannot add another timer', async () => {
    let release;
    const gate = new Promise(resolve => {release = resolve;});
    const h = harness({gate});
    const loading = h.run('initializeApp()');
    for (let i = 0; i < 20 && h.requests.length === 0; i++) await Promise.resolve();
    assert.equal(h.requests.length, 1);
    assert.equal(h.element('retryHistory').disabled, true);
    await h.run('retryMessageHistory()');
    assert.equal(h.requests.length, 1);
    release();
    await loading;
    await h.run('retryMessageHistory()');
    assert.equal(h.requests.length, 1);
    assert.equal(h.timers.length, 1);
});

test('retry status stays outside the replaceable chat panel and is accessible', () => {
    assert.ok(/id="historyStatus"[^>]*role="status"[^>]*aria-live="polite"/.test(html));
    assert.ok(html.indexOf('id="historyStatus"') < html.indexOf('<!-- Chat Area -->'));
    assert.ok(/id="retryHistory"[^>]*onclick="retryMessageHistory\(\)"/.test(html));
});

test('retry replaces a pending send already included in the captured history', async () => {
    const h = harness({headFailures: 1, batches: [[event(100)]]});
    await h.run('initializeApp()');
    h.run(`addMessageToUI('${contact}', 'hello', 'fixture', true)`);
    await h.run('retryMessageHistory()');
    assert.equal(h.messages().length, 1);
    assert.equal(h.messages()[0].id.startsWith('temp-'), false);
    assert.equal(h.messages()[0].blockNumber, 100);
    assert.deepEqual(h.requests, [range(0, 100)]);
    assert.equal(h.timers.length, 1);
});

test('one confirmed send consumes only one matching pending copy', async () => {
    const h = harness({headFailures: 1, batches: [[event(100)]]});
    await h.run('initializeApp()');
    h.run(`addMessageToUI('${contact}', 'hello', 'fixture', true)`);
    h.run(`addMessageToUI('${contact}', 'hello', 'fixture', true)`);
    await h.run('retryMessageHistory()');
    assert.equal(h.messages().length, 2);
    assert.equal(h.messages().filter(message => message.id.startsWith('temp-')).length, 1);
});

test('incoming history does not consume an outgoing pending send with the same text', async () => {
    const incoming = event(100);
    incoming.returnValues.from = contact;
    incoming.returnValues.to = account;
    const h = harness({headFailures: 1, batches: [[incoming]]});
    await h.run('initializeApp()');
    h.run(`addMessageToUI('${contact}', 'hello', 'fixture', true)`);
    await h.run('retryMessageHistory()');
    assert.equal(h.messages().length, 2);
    assert.equal(h.messages().filter(message => message.id.startsWith('temp-')).length, 1);
});

test('an older same-text message does not consume a pending send with a different timestamp', async () => {
    const h = harness({headFailures: 1, batches: [[event(50)]]});
    await h.run('initializeApp()');
    h.run(`addMessageToUI('${contact}', 'hello', 'new-send', true)`);
    await h.run('retryMessageHistory()');
    assert.equal(h.messages().length, 2);
    assert.equal(h.messages().filter(message => message.id.startsWith('temp-')).length, 1);
});

test('an already merged history event does not consume another pending copy', async () => {
    const h = harness({headFailures: 1, batches: [[event(100)]]});
    await h.run('initializeApp()');
    h.run(`messageStore.set('${contact}', [{message: 'hello', timestamp: 'fixture',
        isMyMessage: true, blockNumber: 100, id: '${account}-${contact}-100-fixture-100'}])`);
    h.run(`addMessageToUI('${contact}', 'hello', 'fixture', true)`);
    await h.run('retryMessageHistory()');
    assert.equal(h.messages().length, 2);
    assert.equal(h.messages().filter(message => message.id.startsWith('temp-')).length, 1);
});

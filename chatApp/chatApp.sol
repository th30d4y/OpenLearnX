// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

contract Messenger {
event message(address indexed from ,string message ,address to,string timestamp);
function sendMessage(address _to,string memory _message,string memory time) public {

    emit message(msg.sender,_message,_to,time);
}
    
}

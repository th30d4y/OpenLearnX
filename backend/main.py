from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
import asyncio
from mongo_service import MongoService
from web3_service import Web3Service
from routes import auth, test_flow, certificate, dashboard

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key')
app.config['MONGODB_URI'] = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/openlearnx')
app.config['WEB3_PROVIDER_URL'] = os.getenv('WEB3_PROVIDER_URL', 'http://127.0.0.1:8545')
app.config['CONTRACT_ADDRESS'] = os.getenv('CONTRACT_ADDRESS')
app.config['IPFS_GATEWAY'] = os.getenv('IPFS_GATEWAY', 'https://ipfs.infura.io:5001')

# Initialize services
mongo_service = MongoService(app.config['MONGODB_URI'])
web3_service = Web3Service(app.config['WEB3_PROVIDER_URL'], app.config['CONTRACT_ADDRESS'])

# Make services available to routes
app.config['MONGO_SERVICE'] = mongo_service
app.config['WEB3_SERVICE'] = web3_service

# Register blueprints
app.register_blueprint(auth.bp, url_prefix='/api/auth')
app.register_blueprint(test_flow.bp, url_prefix='/api/test')
app.register_blueprint(certificate.bp, url_prefix='/api/certificate')
app.register_blueprint(dashboard.bp, url_prefix='/api/dashboard')

@app.route('/')
def health_check():
    return jsonify({"status": "OpenLearnX API is running", "version": "1.0.0"})

@app.errorhandler(Exception)
def handle_error(error):
    app.logger.error(f"Error: {str(error)}")
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    # Initialize database
    loop = asyncio.get_event_loop()
    loop.run_until_complete(mongo_service.init_db())
    
    app.run(debug=True, host='0.0.0.0', port=5000)

# Supply Chain Traceability System

A blockchain-based supply chain management system built with React, Firebase, and Ethereum smart contracts.

## Features

- Multi-role user system (Admin, Producer, Distributor, Customer)
- Real-time activity tracking
- Blockchain integration for product traceability
- Supply chain visualization
- Transaction monitoring
- User session management
- Responsive dashboard interfaces

## Prerequisites

- Node.js (v14.0.0 or later)
- npm (v6.0.0 or later)
- MetaMask browser extension
- Git

## Tech Stack

- Frontend: React.js
- Backend: Firebase
- Blockchain: Ethereum (Solidity)
- Database: Firestore
- Authentication: Firebase Auth
- Real-time Updates: Firebase Realtime Database
- Smart Contract Integration: Web3.js & Ethers.js

## Installation

1. Clone the repository:

git clone <repository-url>

cd supply-chain-traceability

2. Install dependencies:

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install

3. Deploy Smart Contracts:

# Install Truffle globally
npm install -g truffle

# Compile contracts
cd smart-contracts
truffle compile

# Deploy to local network
truffle migrate --network development


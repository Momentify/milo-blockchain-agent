import { Alchemy, Network } from 'alchemy-sdk'

const config = {
    apiKey: process.env.ALCHEMY_API_KEY,
    network: process.env.NODE_ENV == 'production' || process.env.NODE_ENV == 'staging' ? Network.BASE_MAINNET : Network.BASE_SEPOLIA
}

let network
if (process.env.NODE_ENV == 'production') network = 'base'
else network = 'base-sepolia'

let usdcTokenAddress, ticketsManagerAddress
if (network === 'base-sepolia') {
    usdcTokenAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
    ticketsManagerAddress = '0x3660220f72e8EF4c5dcb09ff14FAE776E5A708a6'
} else {
    usdcTokenAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    ticketsManagerAddress = '0x6C99313a5823C17Be22338e96928ed6BEaD60A36'
}

console.log(`Alchemy Client is at ${config.network}`)
const alchemyClient = new Alchemy(config)

export { alchemyClient, usdcTokenAddress, ticketsManagerAddress }
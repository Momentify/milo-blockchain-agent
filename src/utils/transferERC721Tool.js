import { getTicketManagerABI } from './ManagerABI.js';
import { z } from 'zod';
import { ticketsManagerAddress } from '../config/alchemy.js';

const ABIFILE = await getTicketManagerABI();

const ticketsManagerJSON = ABIFILE.abi

export const transferTransferPrompt = `
This tool will transfer tokens from one wallet to another using a specified contract.

It takes the following inputs:
- contractAddress: The contract address of the ERC721 token
- from: The wallet address to transfer the token from
- to: The wallet address to transfer the token to
- tokenId: The ID of the token to transfer
`

export const transferInputs = z.object({
    contractAddress: z.string().describe('The contract address of the ERC721 token'),
    from: z.string().describe('The wallet address to transfer the token from'),
    to: z.string().describe('The wallet address to transfer the token to'),
    tokenId: z.string().describe('The ID of the token to transfer')
}).strip().describe('The inputs required to transfer an ERC721 token');

export const transferERC721 = async (wallet, args) => {
    try {
        // Validate args using Zod schema
        const validatedArgs = transferInputs.parse(args);

        console.log(validatedArgs);

        const invokeContract = await wallet.invokeContract({
            contractAddress: ticketsManagerAddress,
            method: 'transferTicket',
            args: {
                ticketsContract: validatedArgs.contractAddress,
                from: validatedArgs.from,
                to: validatedArgs.to,
                tokenId: validatedArgs.tokenId
            },
            abi: ticketsManagerJSON,
            gasless: true
        });

        console.log(invokeContract);

        const result = await invokeContract.wait();

        console.log(result)

        return `Token transferred successfully: ${result.getTransactionHash()}`;
    } catch (error) {
        if (error instanceof z.ZodError) {
            // Handle validation errors
            console.error('Validation error:', error.errors);
            throw new Error(`Invalid arguments: ${error.errors.map(e => e.message).join(', ')}`);
        }
        // Re-throw other errors
        throw error;
    }
}
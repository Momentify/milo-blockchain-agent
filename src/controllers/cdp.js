import { ChatOpenAI } from "@langchain/openai"; // Correct for Bedrock models
import { CdpAgentkit } from "@coinbase/cdp-agentkit-core";
import { CdpToolkit, CdpTool } from "@coinbase/cdp-langchain";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";

import { logger } from "../utils/log.js";

import { getUser } from "../models/user.js";
import { decrypt, fromBase64 } from "../utils/decryptor.cjs";


import * as transferERC721Tool from "../utils/transferERC721Tool.js";

export const initializeCDPAgent = async (walletData) => {

    const llm = new ChatOpenAI({
        model: "gpt-4o-mini",
        temperature: 0.2,
        apiKey: process.env.OPENAI_KEY,
    });

    const config = {
        cdpWalletData: JSON.stringify(walletData),
        networkId: process.env.NETWORK_ID || "base-sepolia",
    };

    const agentkit = await CdpAgentkit.configureWithWallet(config);

    const cdpToolkit = new CdpToolkit(agentkit);
    const tools = cdpToolkit.getTools();

    // Add custom tools
    const erc721TransferTool = new CdpTool({
        name: 'transfer_erc721',
        description: transferERC721Tool.transferTransferPrompt,
        argsSchema: transferERC721Tool.transferInputs,
        func: transferERC721Tool.transferERC721
    }, agentkit,)

    tools.push(erc721TransferTool);

    // Store buffered conversation history in memory
    const memory = new MemorySaver();
    const agentConfig = { configurable: { thread_id: "CDP Agentkit Chatbot Example!" } };

    // Create React Agent using the LLM and CDP Agentkit tools
    const agent = createReactAgent({
        llm,
        tools,
        checkpointSaver: memory,
        verbose: true,
        messageModifier:
            "You are a helpful agent that can interact onchain using the Coinbase Developer Platform Agentkit. You are empowered to interact onchain using your tools. If you ever need funds, you can request them from the faucet if you are on network ID `base-sepolia`. If not, you can provide your wallet details and request funds from the user. If someone asks you to do something you can't do with your currently available tools, you must say so, and encourage them to implement it themselves using the CDP SDK + Agentkit, recommend they go to docs.cdp.coinbase.com for more informaton. Be concise and helpful with your responses. Refrain from restating your tools' descriptions unless it is explicitly requested.",
    });

    return { agent, config: agentConfig };
}

export const ChatAgentKit = async (req, res) => {

    const { prompt, userId } = req.body;

    console.log(`ChatAgentKit: ${prompt}, ${userId}`);

    // get wallet from database generic function, needs to be encrypted with WALLET_KEY
    // const walletData = await getUser(userId);

    // Decode wallet
    // TODO - decrypt wallet data
    const walletDataDecoded = await decrypt(fromBase64(walletData.data.mpc_data), process.env.WALLET_KEY);
    logger.info('wallet decoded', { req, res })

    // Initialize agent
    logger.info("Initializing CDP Agentkit", { req, res });
    const { agent, config } = await initializeCDPAgent(walletDataDecoded);

    // Check required parameters
    const requiredParams = { prompt };
    const missingParams = Object.keys(requiredParams).filter(
        (param) =>
            requiredParams[param] === undefined || requiredParams[param] === null
    );

    if (missingParams.length > 0) {
        const missing = missingParams.join(", ");
        logger.warn(`Missing required parameter(s): ${missing}`, { req, res });
        console.warn(`Missing required parameter(s): ${missing}`);
        return res.status(400).json({
            success: false,
            error: `Missing required parameter(s): ${missing}`,
        });
    }

    logger.info("CDP Agentkit Chatbot Starting to analyse...", { req, res });
    try {
        const stream = await agent.stream({ messages: [new HumanMessage(prompt)] }, config);

        let responseContent = '';
        for await (const chunk of stream) {
            if ("agent" in chunk) {
                responseContent += chunk.agent.messages[0].content;
            } else if ("tools" in chunk) {
                responseContent += chunk.tools.messages[0].content;
            }
        }

        logger.info("CDP Agentkit Chatbot Analysis Complete", { req, res });
        return res.status(200).json({ success: true, message: responseContent });
    } catch (error) {
        if (error instanceof Error) {
            logger.error("Error:", error.message, { req, res });
            console.error("Error:", error.message);
        }
        return res.status(500).json({ success: false, error: error.message });
    }
};
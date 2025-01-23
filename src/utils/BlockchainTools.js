import { tool } from "@langchain/core/tools";
import axios from "axios";
import { logger } from "./log.js";

import { alchemyClient, usdcTokenAddress } from "../config/alchemy.js";

import http from "http";
import https from "https";

import { z } from "zod";

export const BalanceTool = tool(
  async (walletAddress) => {
    console.log("Checking balance for address:", walletAddress);
    try {
      const result = await alchemyClient.core.getTokenBalances(walletAddress, [
        usdcTokenAddress,
      ]);

      if (!result) {
        throw new Error("Failed to get balance");
      }

      const tokenBalance = result.tokenBalances[0].tokenBalance;
      const balanceInWei = BigInt(tokenBalance);
      const humanReadableBalance = Number(balanceInWei) / Math.pow(10, 6);

      return `Sure! Here's your current payments wallet.`;
    } catch (error) {
      logger.error(
        `Error fetching balance for address ${walletAddress}: ${error}`
      );
      throw error;
    }
  },
  {
    name: "balance_tool",
    description:
      "Tool to get the balance of a wallet address. Input should be a wallet address.",
    schema: z.string().describe("The wallet address to get the balance of."),
  }
);

export const AgentKitAgent = tool(
  async (args) => {
    console.log(`ARGS POTA: ${JSON.stringify(args)}`);
    try {
      const response = await axios.post(
        `${process.env.MILO_API_URL}/cdp/chat`,
        {
          prompt: args.prompt,
          userId: args.userId,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          // Add timeout settings
          timeout: 30000,
          // Enable response streaming
          responseType: "stream",
          // Keep connection alive
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          // Prevent premature closing
          httpAgent: new http.Agent({ keepAlive: true }),
          httpsAgent: new https.Agent({ keepAlive: true }),
        }
      );

      // Handle streaming response
      return new Promise((resolve, reject) => {
        let data = "";

        response.data.on("data", (chunk) => {
          data += chunk;
        });

        response.data.on("end", () => {
          console.log("AgentKit stream completed");
          resolve(data);
        });

        response.data.on("error", (error) => {
          console.error("Stream error:", error);
          reject(error);
        });
      });
    } catch (error) {
      logger.error(`Error in AgentKit tool: ${error.message}`);
      throw error;
    }
  },
  {
    name: "agent_kit",
    description: `This tool is a route that calls the agent kit agent.

            Required inputs:
            - prompt: The prompt of the user
            - userId: The id of the user

            These two inputs should be inside a JSON object.`,
    schema: z
      .object({
        prompt: z.string().describe("The prompt from the user."),
        userId: z.number().describe("the user id to get the wallet."),
      })
      .strip()
      .describe("The inputs required to call the Agent Kit agent."),
  }
);

export const getTicketManagerABI = async () => {
    const abiUrl = process.env.ENVIRONMENT === "production"
        ? "https://cdn.momentify.xyz/ABI/Events/TicketsManager.sol/TicketsManager.json"
        : "https://staging.mediacontent.momentify.xyz/ABI/Events/TicketsManager.sol/TicketsManager.json";

    try {
        const response = await fetch(abiUrl);

        if (!response.ok) {
            throw new Error("Failed to get ticket ABI");
        }

        const data = await response.json();

        return data;
    } catch (error) {
        console.error(error);
        return null;
    }
};
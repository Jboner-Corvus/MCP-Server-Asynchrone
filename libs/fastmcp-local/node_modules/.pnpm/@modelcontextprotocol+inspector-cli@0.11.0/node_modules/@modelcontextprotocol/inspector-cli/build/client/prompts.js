// List available prompts
export async function listPrompts(client) {
    try {
        const response = await client.listPrompts();
        return response;
    }
    catch (error) {
        throw new Error(`Failed to list prompts: ${error instanceof Error ? error.message : String(error)}`);
    }
}
// Get a prompt
export async function getPrompt(client, name, args) {
    try {
        const response = await client.getPrompt({
            name,
            arguments: args || {},
        });
        return response;
    }
    catch (error) {
        throw new Error(`Failed to get prompt: ${error instanceof Error ? error.message : String(error)}`);
    }
}

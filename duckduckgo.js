const axios = require("axios");

class DuckDuckGoChat {
	constructor() {
		this._chat_vqd = "";
		this._chat_messages = [];
		this._chat_tokens_count = 0;
	}

	async chat(keywords, model = "gpt-4o-mini", timeout = 30) {
		/**
		 * Initiates a chat session with DuckDuckGo AI.
		 *
		 * @param {string} keywords - The initial message or question to send to the AI.
		 * @param {string} model - The model to use: "gpt-4o-mini", "claude-3-haiku", "llama-3.1-70b", "mixtral-8x7b".
		 *                         Defaults to "gpt-4o-mini".
		 * @param {number} timeout - Timeout value for the HTTP client. Defaults to 30.
		 * @returns {Promise<string>} - The response from the AI.
		 */

		const modelsDeprecated = {
			"gpt-3.5": "gpt-4o-mini",
			"llama-3-70b": "llama-3.1-70b",
		};

		if (modelsDeprecated[model]) {
			console.info(`${model} is deprecated, using ${modelsDeprecated[model]}`);
			model = modelsDeprecated[model];
		}

		const models = {
			"claude-3-haiku": "claude-3-haiku-20240307",
			"gpt-4o-mini": "gpt-4o-mini",
			"llama-3.1-70b": "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
			"mixtral-8x7b": "mistralai/Mixtral-8x7B-Instruct-v0.1",
		};

		// Get vqd if not present
		if (!this._chat_vqd) {
			const statusResp = await axios.get("https://duckduckgo.com/duckchat/v1/status", {
				headers: { "x-vqd-accept": "1" },
			});
			this._chat_vqd = statusResp.headers["x-vqd-4"] || "";
		}

		this._chat_messages.push({ role: "user", content: keywords });
		this._chat_tokens_count += Math.floor(keywords.length / 4) || 1; // Token count approximation

		const json_data = {
			model: models[model],
			messages: this._chat_messages,
		};

		const response = await axios.post("https://duckduckgo.com/duckchat/v1/chat", json_data, {
			headers: { "x-vqd-4": this._chat_vqd },
			timeout: timeout * 1000,
		});

		this._chat_vqd = response.headers["x-vqd-4"] || "";

		// Remove [DONE] and clean the data
		const cleanData = response.data
			.split("[DONE]")[0] // Remove [DONE] and everything after it
			.split("data:")
			.filter((line) => line.trim())
			.map((line) => line.trim());

		let data;
		try {
			data = JSON.parse(`[${cleanData.join(",")}]`);
		} catch (error) {
			throw new Error("Error parsing response data");
		}

		const results = [];
		for (const item of data) {
			if (item.action === "error") {
				const errMessage = item.type || "";
				if (item.status === 429) {
					if (errMessage === "ERR_CONVERSATION_LIMIT") {
						throw new Error("Conversation limit exceeded");
					} else {
						throw new Error("Rate limit exceeded");
					}
				}
				throw new Error(`DuckDuckGo Error: ${errMessage}`);
			} else if (item.message) {
				results.push(item.message);
			}
		}

		const result = results.join("");
		this._chat_messages.push({ role: "assistant", content: result });
		this._chat_tokens_count += result.length;

		return result;
	}
}

module.exports = DuckDuckGoChat;

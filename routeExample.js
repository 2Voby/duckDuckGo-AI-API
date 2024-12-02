const { Router } = require("express");
const ApiError = require("../../../exeptions/api-error");
const DuckDuckGoChat = require("../../../service/duckduckgo");

module.exports = Router({ mergeParams: true }).post("/v1/chat", async (req, res, next) => {
	try {
		const { keywords, model, timeout } = req.body;

		if (!keywords) {
			throw new ApiError(400, "Keywords are required.");
		}

		const chat = new DuckDuckGoChat();

		const response = await chat.chat(keywords, model || "gpt-4o-mini", timeout ? parseInt(timeout) : 30);

		let cleanedData = response
			.replace(/\\n/g, "")
			.replace(/\\t/g, "")
			.replace(/```json\n|\n```/g, "");

		let dataJson = JSON.parse(cleanedData);

		res.status(200).json({ message: dataJson });
	} catch (error) {
		next(error);
	}
});

import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: "AIzaSyAFxbn2ZgZSRG7k3T2Bnze74eAVt3xN4RE" });

export async function run(char) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Can you look through this text and return only a JSON object (do not wrap in triple backticks or explanation text) containing:
- Responsible Party
- Amount of Oil Released
- The Trustees
- The Number of Trustees
- Description of the Event
- Description of Injury Determination and Quantification
- Biological Effects
- Amount of Money Owed by the RP from this claim

Here is the text: ${char}`,
      });
      let stripped_text = response.text.replace(/```json|```/g, '').trim();
      return stripped_text
    } catch (error) {
      console.error("Error:", error);  // Log any errors that occur
    }
  }
  
/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Keep the conversation in the browser so each new message has context.
const conversationHistory = [
  {
    role: "system",
    content:
      'You are a L\'Oréal beauty assistant. Only answer questions about L\'Oréal products, skincare, haircare, makeup, fragrances, beauty routines, product recommendations, and closely related beauty topics. Remember the user\'s name and previous messages when formulating your response. If a question is off topic, reply: "😭😭 Sorry! I cannot answer that. If it is related to L\'Oréal products and beauty advice, I can help! 🫪"',
  },
];

// Add a styled message bubble to the chat window.
const addMessageBubble = (role, text) => {
  const messageBubble = document.createElement("div");
  messageBubble.className = `msg ${role}`;

  const label = document.createElement("span");
  label.className = "message-label";
  label.textContent = role === "user" ? "You" : "Assistant";

  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = text;

  messageBubble.append(label, content);
  chatWindow.appendChild(messageBubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return content;
};

// Show the assistant's welcome message.
addMessageBubble("ai", "👋 Hello!!! How can I help you today?");

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();

  if (!message) {
    return;
  }

  // Show both bubbles immediately while the Worker prepares a response.
  const userMessage = addMessageBubble("user", message);
  const thinkingMessage = addMessageBubble("ai", "Thinking...");
  // Keep the question at the top of the visible chat area.
  userMessage.parentElement.scrollIntoView({ block: "start" });
  userInput.value = "";

  // Save the user's message before sending it with earlier messages.
  conversationHistory.push({ role: "user", content: message });

  try {
    // Send the message to the Cloudflare Worker instead of exposing an API key.
    const response = await fetch(
      "https://mute-forest-8bc8.aapolo.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: conversationHistory,
        }),
      },
    );

    const data = await response.json();

    // The Worker may return an OpenAI error as JSON, so check both HTTP
    // status and the response shape before reading the assistant message.
    if (!response.ok || data.error) {
      const errorMessage =
        data.error?.message || `Worker returned status ${response.status}`;
      throw new Error(errorMessage);
    }

    if (!data.choices?.[0]?.message?.content) {
      throw new Error("The Worker returned an unexpected response.");
    }

    const reply = data.choices[0].message.content;
    // Save the reply so the next question can refer to it.
    conversationHistory.push({ role: "assistant", content: reply });
    thinkingMessage.textContent = reply;
  } catch (error) {
    // Do not keep a message that the Worker did not process successfully.
    conversationHistory.pop();
    console.error("Could not connect to the Cloudflare Worker:", error);
    thinkingMessage.textContent =
      `Sorry, the chatbot could not respond: ${error.message}`;
  }
});

import { useEffect } from "react";

export const WatsonChat = () => {
  useEffect(() => {
    // Define as opções globais do Watson
    window.watsonAssistantChatOptions = {
      integrationID: "9b9f4f40-8602-4df8-beb7-33d01fee4150",
      region: "au-syd",
      serviceInstanceID: "06cae0f0-b964-4f1f-9c8b-78a25030e1c4",
      onLoad: async (instance) => {
        await instance.render();
      },
    };

    // Cria o script e adiciona ao head
    const script = document.createElement("script");
    script.src = `https://web-chat.global.assistant.watson.appdomain.cloud/versions/${
      window.watsonAssistantChatOptions.clientVersion || "latest"
    }/WatsonAssistantChatEntry.js`;
    script.async = true;
    document.head.appendChild(script);

    // Cleanup (remover o script quando o componente desmonta)
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return null; // Não precisa renderizar nada no DOM
};

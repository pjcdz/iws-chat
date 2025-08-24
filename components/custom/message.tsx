"use client";

import { UIMessagePart } from "ai";
import { motion } from "framer-motion";

import { BotIcon, UserIcon } from "./icons";
import { Markdown } from "./markdown";
import { PreviewAttachment } from "./preview-attachment";
import { Weather } from "./weather";

export const Message = ({
  chatId,
  role,
  parts,
}: {
  chatId: string;
  role: string;
  parts: Array<UIMessagePart<any, any>>;
}) => {
  return (
    <motion.div
      className={`flex flex-row gap-4 px-4 w-full md:w-[500px] md:px-0 first-of-type:pt-20`}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="size-[24px] border rounded-sm p-1 flex flex-col justify-center items-center shrink-0 text-zinc-500">
        {role === "assistant" ? <BotIcon /> : <UserIcon />}
      </div>

      <div className="flex flex-col gap-2 w-full">
        {parts.map((part, index) => {
          switch (part.type) {
            case 'text':
              return (
                <div key={index} className="text-zinc-800 dark:text-zinc-300 flex flex-col gap-4">
                  <Markdown id={`message-${role}-${chatId}-${index}`}>{part.text}</Markdown>
                </div>
              );

            case 'tool-getWeather':
              switch (part.state) {
                case 'input-streaming':
                case 'input-available':
                  return (
                    <div key={index} className="skeleton">
                      <Weather />
                    </div>
                  );
                case 'output-available':
                  return (
                    <div key={index}>
                      <Weather weatherAtLocation={part.output} />
                    </div>
                  );
                case 'output-error':
                  return (
                    <div key={index} className="text-red-500">
                      Error: {part.errorText}
                    </div>
                  );
              }
              break;

            case 'dynamic-tool':
              switch (part.state) {
                case 'input-streaming':
                case 'input-available':
                  return (
                    <div key={index} className="skeleton">
                      Tool: {part.toolName}
                    </div>
                  );
                case 'output-available':
                  return (
                    <div key={index}>
                      <div>Tool: {part.toolName}</div>
                      <pre>{JSON.stringify(part.output, null, 2)}</pre>
                    </div>
                  );
                case 'output-error':
                  return (
                    <div key={index} className="text-red-500">
                      Tool Error: {part.errorText}
                    </div>
                  );
              }
              break;

            case 'file':
              if (part.mediaType?.startsWith('image/')) {
                return (
                  <div key={index}>
                    <img src={part.url} alt="Attachment" />
                  </div>
                );
              } else {
                return (
                  <div key={index}>
                    <PreviewAttachment attachment={{ url: part.url, name: 'file', contentType: part.mediaType }} />
                  </div>
                );
              }

            default:
              return null;
          }
        })}
      </div>
    </motion.div>
  );
};

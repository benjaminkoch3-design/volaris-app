// src/components/chat/ChatView.tsx

import React, { useState } from "react";
import { UserRole, ChatMessage, AthleteProfile } from "../../types";

interface ChatViewProps {
  userRole: UserRole;
  currentAthleteName: string;
  athleteId: string;
  messages: ChatMessage[];
  onSendMessage: (text: string, targetAthleteId: string) => void;
  managedAthletes?: AthleteProfile[];
  onRenameContact?: (newName: string) => void;
  onDisconnectCoach?: () => void; // 👈 Dissociation par l'athlète
}

export const ChatView: React.FC<ChatViewProps> = ({
  userRole,
  currentAthleteName,
  athleteId,
  messages,
  onSendMessage,
  managedAthletes = [],
  onRenameContact,
  onDisconnectCoach,
}) => {
  const [inputText, setInputText] = useState("");
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(
    userRole === "coach" ? null : athleteId
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [customNameInput, setCustomNameInput] = useState(currentAthleteName);

  const isCoach = userRole === "coach";
  const themeColor = isCoach ? "#CDCF61" : "#CF9A61";

  const activeConversationAthlete = managedAthletes.find(
    (a) => a.id === (isCoach ? selectedAthleteId : athleteId)
  );

  const targetId = isCoach ? selectedAthleteId || "" : athleteId;
  const conversationMessages = messages.filter(
    (m) => m.athleteId === targetId
  );

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !targetId) return;
    onSendMessage(inputText.trim(), targetId);
    setInputText("");
  };

  const handleSaveName = () => {
    if (customNameInput.trim() && onRenameContact) {
      onRenameContact(customNameInput.trim());
    }
    setIsEditingName(false);
  };

  const displayedContactName = isCoach
    ? activeConversationAthlete?.name || "Athlète"
    : currentAthleteName || "Mon Entraîneur";

  return (
    <div className="space-y-4 animate-fadeIn font-sans max-w-2xl mx-auto pb-6">
      {/* VUE 1 : LISTE DES CONVERSATIONS (MODE COACH) */}
      {isCoach && !selectedAthleteId ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-stone-800 pb-3">
            <div>
              <span className="text-[10px] font-bold text-[#CDCF61] uppercase tracking-widest block">
                Messagerie Coach
              </span>
              <h2 className="text-xl font-black uppercase text-stone-100">
                💬 Messages ({managedAthletes.length})
              </h2>
            </div>
          </div>

          <div className="space-y-2">
            {managedAthletes.length === 0 ? (
              <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-center mx-auto text-xl text-[#CDCF61]">
                  💬
                </div>
                <p className="text-xs text-stone-400 font-bold">Aucun athlète associé pour le moment.</p>
                <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
                  Partagez votre Code Coach pour que vos athlètes puissent vous contacter.
                </p>
              </div>
            ) : (
              managedAthletes.map((athlete) => {
                const athleteMsgs = messages.filter((m) => m.athleteId === athlete.id);
                const lastMsg = athleteMsgs[athleteMsgs.length - 1];

                return (
                  <div
                    key={athlete.id}
                    onClick={() => setSelectedAthleteId(athlete.id)}
                    className="bg-stone-900/90 border border-stone-800 hover:border-[#CDCF61]/50 p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition shadow-lg group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-2xl bg-[#CDCF61]/10 border border-[#CDCF61]/30 flex items-center justify-center font-black text-[#CDCF61] text-base shrink-0">
                        {athlete.name ? athlete.name.charAt(0).toUpperCase() : "A"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-center gap-2">
                          <h4 className="text-xs font-black uppercase text-stone-100 group-hover:text-[#CDCF61] transition truncate">
                            {athlete.name}
                          </h4>
                          {lastMsg && (
                            <span className="text-[9px] font-bold text-stone-500 shrink-0">
                              {lastMsg.timestamp}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-stone-400 truncate mt-0.5">
                          {lastMsg
                            ? `${lastMsg.senderRole === "coach" ? "Vous : " : ""}${lastMsg.text}`
                            : "Aucun message pour le moment. Cliquez pour discuter."}
                        </p>
                      </div>
                    </div>

                    <span className="text-stone-500 group-hover:text-[#CDCF61] text-xs ml-3 transition shrink-0">
                      ➔
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* VUE 2 : FIL DE DISCUSSION DÉDIÉ */
        <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-4 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2.5">
              {isCoach && (
                <button
                  type="button"
                  onClick={() => setSelectedAthleteId(null)}
                  className="text-stone-400 hover:text-stone-100 text-xs font-extrabold bg-stone-950 px-2.5 py-1.5 rounded-xl border border-stone-800 transition cursor-pointer"
                >
                  ← Conversations
                </button>
              )}

              <div>
                <span
                  style={{ color: themeColor }}
                  className="text-[9px] font-black uppercase tracking-wider block"
                >
                  {isCoach ? "Discussion avec" : "Votre Entraîneur"}
                </span>

                {!isCoach && isEditingName ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="text"
                      value={customNameInput}
                      onChange={(e) => setCustomNameInput(e.target.value)}
                      className="bg-stone-950 border border-stone-700 text-stone-100 text-xs px-2 py-0.5 rounded-lg focus:outline-none focus:border-[#CF9A61]"
                      placeholder="Nom du coach..."
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-lg"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="text-[10px] bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded-lg"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black uppercase text-stone-100">
                      {displayedContactName}
                    </h3>
                    {!isCoach && onRenameContact && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomNameInput(currentAthleteName);
                          setIsEditingName(true);
                        }}
                        className="text-stone-500 hover:text-stone-300 text-xs"
                        title="Renommer mon entraîneur"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* BOUTON DISSOCIATION POUR L'ATHLÈTE */}
              {!isCoach && onDisconnectCoach && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Êtes-vous sûr de vouloir retirer votre coach ? Votre plan d'entraînement actuel restera actif et vous pourrez à nouveau le modifier librement.")) {
                      onDisconnectCoach();
                    }
                  }}
                  className="text-[9.5px] font-black uppercase text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-950/60 border border-red-800/40 px-2.5 py-1 rounded-xl transition cursor-pointer"
                  title="Mettre fin à la collaboration avec mon entraîneur"
                >
                  Dissocier
                </button>
              )}

              <div className="w-8 h-8 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-center text-xs font-black text-stone-300">
                {displayedContactName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          {/* ZONE D'AFFICHAGE DES MESSAGES */}
          <div className="space-y-3 min-h-[280px] max-h-[50vh] overflow-y-auto custom-scrollbar pr-1 p-1 flex flex-col justify-end">
            {conversationMessages.length === 0 ? (
              <div className="text-center py-10 space-y-2 m-auto">
                <div className="text-2xl">💬</div>
                <p className="text-xs text-stone-500 italic">
                  Aucun message échangé pour le moment. Envoyez votre premier message !
                </p>
              </div>
            ) : (
              conversationMessages.map((msg) => {
                const isMe =
                  (isCoach && msg.senderRole === "coach") ||
                  (!isCoach && msg.senderRole === "athlete");

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isMe ? "items-end ml-auto" : "items-start mr-auto"
                    } max-w-[85%]`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5 px-1">
                      <span className="text-[9px] font-bold text-stone-400">
                        {isMe ? "Vous" : msg.senderName}
                      </span>
                      <span className="text-[8px] text-stone-500">
                        • {msg.timestamp}
                      </span>
                    </div>

                    <div
                      style={{
                        backgroundColor: isMe ? themeColor : "#0c0a09",
                        color: isMe ? "#0c0a09" : "#f5f5f4",
                        borderColor: isMe ? themeColor : "#27272a",
                      }}
                      className={`p-3 rounded-2xl border text-xs leading-relaxed shadow-md ${
                        isMe
                          ? "rounded-tr-none font-bold"
                          : "rounded-tl-none font-medium"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* CHAMP DE SAISIE */}
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 pt-2 border-t border-stone-800"
          >
            <input
              type="text"
              required
              placeholder="Écrivez votre message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-stone-950 border border-stone-800 rounded-2xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-stone-700"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              style={{ backgroundColor: themeColor }}
              className="py-2.5 px-4 text-stone-950 font-black text-xs uppercase rounded-2xl transition cursor-pointer shadow-md hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Envoyer
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
// src/components/chat/ChatView.tsx

import React, { useState, useRef, useEffect } from "react";
import { UserRole, ChatMessage, AthleteProfile } from "../../types";

interface ChatViewProps {
  userRole: UserRole;
  currentAthleteName: string;
  athleteId: string;
  messages: ChatMessage[];
  onSendMessage: (text: string, targetAthleteId: string) => void;
  onDeleteMessage?: (messageId: string) => void; // 👈 Suppression de messages
  managedAthletes?: AthleteProfile[];
  onRenameContact?: (newName: string) => void;
  onDisconnectCoach?: () => void; // 👈 Dissociation par l'athlète
  myAvatarUrl?: string; // 👈 Photo de profil de l'utilisateur connecté
  contactAvatarUrl?: string; // 👈 Photo de profil du contact
}

export const ChatView: React.FC<ChatViewProps> = ({
  userRole,
  currentAthleteName,
  athleteId,
  messages,
  onSendMessage,
  onDeleteMessage,
  managedAthletes = [],
  onRenameContact,
  onDisconnectCoach,
  myAvatarUrl,
  contactAvatarUrl,
}) => {
  const [inputText, setInputText] = useState("");
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(
    userRole === "coach" ? null : athleteId
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [customNameInput, setCustomNameInput] = useState(currentAthleteName);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isCoach = userRole === "coach";
  const themeColor = isCoach ? "#CDCF61" : "#CF9A61";

  const activeConversationAthlete = managedAthletes.find(
    (a) => a.id === (isCoach ? selectedAthleteId : athleteId)
  );

  const targetId = isCoach ? selectedAthleteId || "" : athleteId;
  const conversationMessages = messages.filter(
    (m) => m.athleteId === targetId
  );

  useEffect(() => {
    setCustomNameInput(currentAthleteName);
  }, [currentAthleteName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages]);

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

  const displayedContactAvatar = isCoach
    ? activeConversationAthlete?.avatarUrl || (activeConversationAthlete as any)?.avatar_url
    : contactAvatarUrl;

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
                const athAvatar = athlete.avatarUrl || (athlete as any).avatar_url;

                return (
                  <div
                    key={athlete.id}
                    onClick={() => setSelectedAthleteId(athlete.id)}
                    className="bg-stone-900/90 border border-stone-800 hover:border-[#CDCF61]/50 p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition shadow-lg group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* AVATAR ATHLÈTE DANS LA LISTE */}
                      <div className="w-11 h-11 rounded-2xl bg-[#CDCF61]/10 border border-[#CDCF61]/30 flex items-center justify-center font-black text-[#CDCF61] text-base shrink-0 overflow-hidden shadow-inner">
                        {athAvatar ? (
                          <img
                            src={athAvatar}
                            alt={athlete.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{athlete.name ? athlete.name.charAt(0).toUpperCase() : "A"}</span>
                        )}
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
          
          {/* HEADER DE LA DISCUSSION */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-3">
              {isCoach && (
                <button
                  type="button"
                  onClick={() => setSelectedAthleteId(null)}
                  className="text-stone-400 hover:text-stone-100 text-xs font-extrabold bg-stone-950 px-2.5 py-1.5 rounded-xl border border-stone-800 transition cursor-pointer"
                >
                  ←
                </button>
              )}

              {/* AVATAR DU CONTACT */}
              <div className="w-10 h-10 rounded-full bg-stone-950 border border-stone-800 flex items-center justify-center font-black text-sm shrink-0 overflow-hidden shadow-inner">
                {displayedContactAvatar ? (
                  <img
                    src={displayedContactAvatar}
                    alt={displayedContactName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span style={{ color: themeColor }}>
                    {displayedContactName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

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
                      className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-lg cursor-pointer"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="text-[10px] bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded-lg cursor-pointer"
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
                        className="text-stone-500 hover:text-stone-300 text-xs cursor-pointer"
                        title="Renommer mon entraîneur"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

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
          </div>

          {/* ZONE D'AFFICHAGE DES MESSAGES */}
          <div className="space-y-3 min-h-[300px] max-h-[52vh] overflow-y-auto custom-scrollbar pr-1 p-1 flex flex-col">
            {conversationMessages.length === 0 ? (
              <div className="text-center py-12 space-y-2 m-auto">
                <div className="text-3xl">💬</div>
                <p className="text-xs text-stone-500 italic">
                  Aucun message échangé pour le moment. Envoyez votre premier message !
                </p>
              </div>
            ) : (
              conversationMessages.map((msg) => {
                const isMe =
                  (isCoach && msg.senderRole === "coach") ||
                  (!isCoach && msg.senderRole === "athlete");

                const avatarSrc = isMe ? myAvatarUrl : displayedContactAvatar;

                return (
                  <div
                    key={msg.id}
                    onMouseEnter={() => setHoveredMessageId(msg.id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                    className={`flex items-end gap-2 group ${
                      isMe ? "justify-end ml-auto" : "justify-start mr-auto"
                    } max-w-[85%]`}
                  >
                    {/* AVATAR CONTACT (À GAUCHE) */}
                    {!isMe && (
                      <div className="w-7 h-7 rounded-full bg-stone-950 border border-stone-800 overflow-hidden flex items-center justify-center shrink-0 mb-1 shadow">
                        {avatarSrc ? (
                          <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-black text-stone-400">
                            {msg.senderName?.charAt(0).toUpperCase() || "C"}
                          </span>
                        )}
                      </div>
                    )}

                    {/* BOUTON SUPPRESSION (POUR MES MESSAGES) */}
                    {isMe && onDeleteMessage && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Voulez-vous supprimer ce message ?")) {
                            onDeleteMessage(msg.id);
                          }
                        }}
                        className={`text-stone-500 hover:text-red-400 text-xs p-1 transition cursor-pointer self-center ${
                          hoveredMessageId === msg.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                        title="Supprimer ce message"
                      >
                        🗑️
                      </button>
                    )}

                    {/* BULLE DU MESSAGE */}
                    <div className="flex flex-col">
                      <div
                        className={`flex items-center gap-1.5 mb-1 px-1 ${
                          isMe ? "justify-end" : "justify-start"
                        }`}
                      >
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
                        className={`p-3 rounded-2xl border text-xs leading-relaxed shadow-md break-words whitespace-pre-wrap ${
                          isMe
                            ? "rounded-tr-none font-bold"
                            : "rounded-tl-none font-medium"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>

                    {/* MON AVATAR (À DROITE) */}
                    {isMe && (
                      <div className="w-7 h-7 rounded-full bg-stone-950 border border-stone-800 overflow-hidden flex items-center justify-center shrink-0 mb-1 shadow">
                        {avatarSrc ? (
                          <img src={avatarSrc} alt="Mon Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-black text-[#CF9A61]">
                            {msg.senderName?.charAt(0).toUpperCase() || "M"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
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
              className="flex-1 bg-stone-950 border border-stone-800 rounded-2xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-stone-700 placeholder:text-stone-500"
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
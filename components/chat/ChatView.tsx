// src/components/chat/ChatView.tsx

import React, { useState, useRef, useEffect } from "react";
import { UserRole, ChatMessage, AthleteProfile } from "../../types";

interface ChatViewProps {
  userRole: UserRole;
  currentAthleteName: string;
  athleteId: string;
  messages: ChatMessage[];
  onSendMessage: (text: string, targetAthleteId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  managedAthletes?: AthleteProfile[];
  onRenameContact?: (newName: string) => void;
  onDisconnectCoach?: () => void;
  myAvatarUrl?: string;
  contactAvatarUrl?: string;
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
    <div className="space-y-4 animate-fadeIn font-sans w-full max-w-none px-2 sm:px-4 md:px-8 pb-6">
      {/* VUE 1 : LISTE DES CONVERSATIONS (MODE COACH) */}
      {isCoach && !selectedAthleteId ? (
        <div className="space-y-4 w-full">
          <div className="flex justify-between items-center border-b border-stone-200 dark:border-stone-800 pb-3">
            <div>
              <span className="text-[10px] font-black text-[#5c6e10] dark:text-[#CDCF61] uppercase tracking-widest block">
                Messagerie Coach
              </span>
              {/* MOT "MESSAGES" ET COMPTEUR : noir net en clair, blanc pur en sombre */}
              <h2 className="text-xl font-black uppercase text-[#1c1917] dark:text-[#f5f5f4]">
                💬 Messages ({managedAthletes.length})
              </h2>
            </div>
          </div>

          <div className="space-y-2.5 w-full">
            {managedAthletes.length === 0 ? (
              <div className="bg-white dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-3xl p-8 text-center space-y-2 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex items-center justify-center mx-auto text-xl text-[#5c6e10] dark:text-[#CDCF61]">
                  💬
                </div>
                <p className="text-xs text-[#1c1917] dark:text-[#f5f5f4] font-bold">
                  Aucun athlète associé pour le moment.
                </p>
                <p className="text-[11px] text-stone-600 dark:text-stone-400 max-w-xs mx-auto">
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
                    className="w-full bg-white dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-[#CDCF61]/50 p-4 rounded-2xl flex items-center justify-between cursor-pointer transition shadow-sm hover:shadow-md group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* AVATAR ATHLÈTE DANS LA LISTE */}
                      <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-[#CDCF61]/10 border border-stone-300 dark:border-[#CDCF61]/30 flex items-center justify-center font-black text-[#1c1917] dark:text-[#CDCF61] text-base shrink-0 overflow-hidden shadow-inner">
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
                          {/* NOM DE L'ATHLÈTE : noir bien contrasté en clair, blanc pur en sombre */}
                          <h4 className="text-xs font-black uppercase text-[#1c1917] dark:text-[#f5f5f4] group-hover:text-[#5c6e10] dark:group-hover:text-[#CDCF61] transition truncate">
                            {athlete.name}
                          </h4>
                          {lastMsg && (
                            <span className="text-[9px] font-bold text-stone-500 dark:text-stone-400 shrink-0">
                              {lastMsg.timestamp}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-stone-600 dark:text-stone-400 truncate mt-0.5 font-medium">
                          {lastMsg
                            ? `${lastMsg.senderRole === "coach" ? "Vous : " : ""}${lastMsg.text}`
                            : "Aucun message pour le moment. Cliquez pour discuter."}
                        </p>
                      </div>
                    </div>

                    <span className="text-stone-500 dark:text-stone-400 group-hover:text-[#1c1917] dark:group-hover:text-[#CDCF61] text-xs ml-4 transition shrink-0">
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
        <div className="w-full bg-white dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
          
          {/* HEADER DE LA DISCUSSION */}
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
            <div className="flex items-center gap-3">
              {isCoach && (
                <button
                  type="button"
                  onClick={() => setSelectedAthleteId(null)}
                  className="text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-stone-100 text-xs font-extrabold bg-stone-100 dark:bg-stone-950 px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 transition cursor-pointer"
                  title="Retour à la liste"
                >
                  ←
                </button>
              )}

              {/* AVATAR DU CONTACT */}
              <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex items-center justify-center font-black text-sm shrink-0 overflow-hidden shadow-inner">
                {displayedContactAvatar ? (
                  <img
                    src={displayedContactAvatar}
                    alt={displayedContactName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[#1c1917] dark:text-[#CDCF61]">
                    {displayedContactName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[9px] font-black uppercase tracking-wider block text-stone-600 dark:text-stone-400">
                  {isCoach ? "Discussion avec" : "Votre Entraîneur"}
                </span>

                {!isCoach && isEditingName ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="text"
                      value={customNameInput}
                      onChange={(e) => setCustomNameInput(e.target.value)}
                      className="bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 text-[#1c1917] dark:text-[#f5f5f4] text-xs px-2 py-0.5 rounded-lg focus:outline-none focus:border-stone-500"
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
                      className="text-[10px] bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-1.5 py-0.5 rounded-lg cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black uppercase text-[#1c1917] dark:text-[#f5f5f4]">
                      {displayedContactName}
                    </h3>
                    {!isCoach && onRenameContact && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomNameInput(currentAthleteName);
                          setIsEditingName(true);
                        }}
                        className="text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 text-xs cursor-pointer"
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
                className="text-[9.5px] font-black uppercase text-red-600 dark:text-red-400 hover:text-red-700 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 border border-red-200 dark:border-red-800/40 px-2.5 py-1 rounded-xl transition cursor-pointer"
                title="Mettre fin à la collaboration avec mon entraîneur"
              >
                Dissocier
              </button>
            )}
          </div>

          {/* ZONE D'AFFICHAGE DES MESSAGES */}
          <div className="space-y-3 min-h-[380px] max-h-[62vh] md:max-h-[68vh] overflow-y-auto custom-scrollbar pr-2 p-1 flex flex-col w-full">
            {conversationMessages.length === 0 ? (
              <div className="text-center py-16 space-y-2 m-auto">
                <div className="text-4xl">💬</div>
                <p className="text-xs text-stone-600 dark:text-stone-400 italic">
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
                    className={`flex items-end gap-2.5 group ${
                      isMe ? "justify-end ml-auto" : "justify-start mr-auto"
                    } max-w-[85%] md:max-w-[70%]`}
                  >
                    {/* AVATAR CONTACT (À GAUCHE) */}
                    {!isMe && (
                      <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 overflow-hidden flex items-center justify-center shrink-0 mb-1 shadow-sm">
                        {avatarSrc ? (
                          <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-black text-stone-800 dark:text-stone-300">
                            {msg.senderName?.charAt(0).toUpperCase() || "C"}
                          </span>
                        )}
                      </div>
                    )}

                    {/* BOUTON SUPPRESSION */}
                    {isMe && onDeleteMessage && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Voulez-vous supprimer ce message ?")) {
                            onDeleteMessage(msg.id);
                          }
                        }}
                        className={`text-stone-400 hover:text-red-500 text-xs p-1 transition cursor-pointer self-center ${
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
                        <span className="text-[9px] font-bold text-stone-600 dark:text-stone-400">
                          {isMe ? "Vous" : msg.senderName}
                        </span>
                        <span className="text-[8px] text-stone-500 dark:text-stone-400">
                          • {msg.timestamp}
                        </span>
                      </div>

                      <div
                        style={{
                          backgroundColor: isMe ? themeColor : undefined,
                          borderColor: isMe ? themeColor : undefined,
                        }}
                        className={`p-3.5 rounded-2xl border text-xs leading-relaxed shadow-sm break-words whitespace-pre-wrap ${
                          isMe
                            ? "rounded-tr-none text-stone-950 font-bold"
                            : "rounded-tl-none font-medium bg-stone-100 dark:bg-stone-950 text-[#1c1917] dark:text-[#f5f5f4] border-stone-200 dark:border-stone-800"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>

                    {/* MON AVATAR (À DROITE) */}
                    {isMe && (
                      <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 overflow-hidden flex items-center justify-center shrink-0 mb-1 shadow-sm">
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
            className="flex items-center gap-2 pt-3 border-t border-stone-200 dark:border-stone-800 w-full"
          >
            <input
              type="text"
              required
              placeholder="Écrivez votre message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-2xl px-4 py-3 text-xs text-[#1c1917] dark:text-[#f5f5f4] focus:outline-none focus:border-stone-500 placeholder:text-stone-400 dark:placeholder:text-stone-500 transition shadow-inner"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              style={{ backgroundColor: themeColor }}
              className="py-3 px-5 text-stone-950 font-black text-xs uppercase tracking-wider rounded-2xl transition cursor-pointer shadow-md hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              Envoyer
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
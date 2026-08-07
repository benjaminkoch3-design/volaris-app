// src/components/chat/ChatView.tsx

import React, { useState } from "react";
import { UserRole, ChatMessage, AthleteProfile } from "../../types";

interface ChatViewProps {
  userRole: UserRole;
  currentAthleteName: string;
  athleteId: string;
  messages: ChatMessage[];
  onSendMessage: (text: string, targetAthleteId: string) => void;
  // Liste des athlètes pour la vue coach
  managedAthletes?: AthleteProfile[];
}

// Données de secours d'athlètes si non transmises
const DEFAULT_ATHLETES: AthleteProfile[] = [
  {
    id: "ath1",
    name: "Benjamin",
    email: "benjamin@running.com",
    vma: "14.5",
    targetGoal: "10 km",
    targetDate: "24/11/2026",
    targetTime: "41:30",
    weeklyKm: 42.5,
    adherenceRate: 92,
    lastActive: "Aujourd'hui",
    status: "En forme",
  },
  {
    id: "ath2",
    name: "Sarah L.",
    email: "sarah@running.com",
    vma: "16.0",
    targetGoal: "Semi-Marathon",
    targetDate: "15/10/2026",
    targetTime: "1:35:00",
    weeklyKm: 58.0,
    adherenceRate: 88,
    lastActive: "Hier",
    status: "En forme",
  },
  {
    id: "ath3",
    name: "Thomas B.",
    email: "thomas@running.com",
    vma: "13.2",
    targetGoal: "Marathon",
    targetDate: "05/04/2027",
    targetTime: "3:30:00",
    weeklyKm: 65.0,
    adherenceRate: 75,
    lastActive: "Il y a 2 jours",
    status: "Attention fatigue",
  },
];

export const ChatView: React.FC<ChatViewProps> = ({
  userRole,
  currentAthleteName,
  athleteId,
  messages,
  onSendMessage,
  managedAthletes = DEFAULT_ATHLETES,
}) => {
  const [inputText, setInputText] = useState("");
  // Pour le coach : ID de l'athlète dont la discussion est sélectionnée (null = liste SMS)
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(
    userRole === "coach" ? null : athleteId
  );

  const isCoach = userRole === "coach";
  const themeColor = isCoach ? "#CDCF61" : "#CF9A61";

  // Retrouver l'athlète actuellement sélectionné dans le fil de discussion
  const activeConversationAthlete = managedAthletes.find(
    (a) => a.id === (isCoach ? selectedAthleteId : athleteId)
  );

  // Filtrer les messages pour la conversation active
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

  return (
    <div className="space-y-4 animate-fadeIn font-sans max-w-2xl mx-auto pb-6">
      {/* VUE 1 : LISTE DES CONVERSATIONS SMS (MODE COACH SANS ATHLÈTE SÉLECTIONNÉ) */}
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
            {managedAthletes.map((athlete) => {
              // Récupérer le dernier message échangé avec cet athlète
              const athleteMsgs = messages.filter(
                (m) => m.athleteId === athlete.id
              );
              const lastMsg = athleteMsgs[athleteMsgs.length - 1];

              return (
                <div
                  key={athlete.id}
                  onClick={() => setSelectedAthleteId(athlete.id)}
                  className="bg-stone-900/90 border border-stone-800 hover:border-[#CDCF61]/50 p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition shadow-lg group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* AVATAR DE L'ATHLÈTE */}
                    <div className="w-11 h-11 rounded-2xl bg-[#CDCF61]/10 border border-[#CDCF61]/30 flex items-center justify-center font-black text-[#CDCF61] text-base shrink-0">
                      {athlete.name.charAt(0)}
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
            })}
          </div>
        </div>
      ) : (
        /* VUE 2 : FIL DE DISCUSSION DÉDIÉ (ATHLÈTE OU COACH SUR UN ATHLÈTE) */
        <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-4 shadow-xl space-y-4">
          {/* EN-TÊTE DU FIL DE DISCUSSION */}
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
                <h3 className="text-sm font-black uppercase text-stone-100">
                  {isCoach
                    ? activeConversationAthlete?.name || "Athlète"
                    : "Coach David"}
                </h3>
              </div>
            </div>

            <div className="w-8 h-8 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-center text-xs font-black text-stone-300">
              {isCoach
                ? activeConversationAthlete?.name.charAt(0) || "A"
                : "C"}
            </div>
          </div>

          {/* ZONE D'AFFICHAGE DES MESSAGES DESK/MOBILE */}
          <div className="space-y-3 min-h-[280px] max-h-[50vh] overflow-y-auto custom-scrollbar pr-1 p-1">
            {conversationMessages.length === 0 ? (
              <div className="text-center py-10 space-y-2">
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
                      isMe ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5 px-1">
                      <span className="text-[9px] font-bold text-stone-400">
                        {msg.senderName}
                      </span>
                      <span className="text-[8px] text-stone-500">
                        • {msg.timestamp}
                      </span>
                    </div>

                    <div
                      style={{
                        backgroundColor: isMe
                          ? themeColor
                          : "#0c0a09",
                        color: isMe ? "#0c0a09" : "#f5f5f4",
                        borderColor: isMe ? themeColor : "#27272a",
                      }}
                      className={`p-3 rounded-2xl border text-xs max-w-[82%] leading-relaxed shadow-md ${
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

          {/* CHAMP DE SAISIE DE MESSAGE */}
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
              style={{ backgroundColor: themeColor }}
              className="py-2.5 px-4 text-stone-950 font-black text-xs uppercase rounded-2xl transition cursor-pointer shadow-md hover:brightness-110"
            >
              Envoyer
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
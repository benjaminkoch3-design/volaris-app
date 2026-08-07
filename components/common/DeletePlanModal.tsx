// src/components/common/DeletePlanModal.tsx

import React from "react";

interface DeletePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export const DeletePlanModal: React.FC<DeletePlanModalProps> = ({
  isOpen,
  onClose,
  onArchive,
  onDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
        <h3 className="text-sm font-black uppercase text-stone-100">
          Changer de plan ?
        </h3>
        <p className="text-xs text-stone-400">
          Souhaitez-vous archiver votre plan actuel dans votre profil ou le supprimer définitivement ?
        </p>
        
        <div className="space-y-2 pt-2">
          <button
            onClick={onArchive}
            className="w-full py-2.5 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-bold text-xs uppercase rounded-xl transition cursor-pointer shadow-md"
          >
            📦 Archiver le plan
          </button>
          
          <button
            onClick={onDelete}
            className="w-full py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
          >
            🗑️ Supprimer définitivement
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 bg-stone-800 hover:bg-stone-700 text-stone-400 font-semibold text-xs uppercase rounded-xl transition cursor-pointer mt-1"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};
import React from 'react';
import { Link2, PauseCircle, ShieldAlert, X } from 'lucide-react';
import { SmartDisplayLocaleBundle } from '../../../../utils/smartMosqueDisplayI18n';

interface DisplayStandbyScreenProps {
  isBlocked: boolean;
  t: SmartDisplayLocaleBundle;
  onOpenPairModal: () => void;
  onDisconnect: () => void;
}

export const DisplayStandbyScreen: React.FC<DisplayStandbyScreenProps> = ({
  isBlocked,
  t,
  onOpenPairModal,
  onDisconnect,
}) => (
  <div className="w-screen h-screen bg-[#041A12] text-[#FAF7F0] flex flex-col items-center justify-center p-8 text-center select-none">
    <div className="max-w-xl space-y-6">
      <img
        src="/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg"
        alt="ASAKA ZIYO"
        className="w-24 h-24 rounded-full mx-auto border border-[#DFBD69]/60 object-cover"
      />
      <div className="flex justify-center">
        {isBlocked ? (
          <ShieldAlert className="w-12 h-12 text-rose-400" />
        ) : (
          <PauseCircle className="w-12 h-12 text-[#DFBD69]" />
        )}
      </div>
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#FAF7F0]">
        {isBlocked ? t.monitorBlockedTitle : t.monitorDisabledTitle}
      </h1>
      <p className="text-base sm:text-lg text-[#FAF7F0]/75 leading-relaxed">
        {isBlocked ? t.monitorBlockedSubtitle : t.monitorDisabledSubtitle}
      </p>
      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onOpenPairModal}
          className="px-5 py-2.5 rounded-xl bg-[#DFBD69] text-[#041A12] font-bold text-sm cursor-pointer"
        >
          {t.pairMonitorButton}
        </button>
        <button
          type="button"
          onClick={onDisconnect}
          className="px-5 py-2.5 rounded-xl border border-[#DFBD69]/40 text-[#FAF7F0] text-sm font-semibold cursor-pointer"
        >
          {t.pairPreviewButtonLabel}
        </button>
      </div>
    </div>
  </div>
);

interface DisplayPairingModalProps {
  isOpen: boolean;
  isPaired: boolean;
  monitorName?: string;
  pairCodeInput: string;
  pairError: string | null;
  isPairing: boolean;
  t: SmartDisplayLocaleBundle;
  onChangeCode: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDisconnect: () => void;
  onClose: () => void;
}

export const DisplayPairingModal: React.FC<DisplayPairingModalProps> = ({
  isOpen,
  isPaired,
  monitorName,
  pairCodeInput,
  pairError,
  isPairing,
  t,
  onChangeCode,
  onSubmit,
  onDisconnect,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#041A12] border border-[#DFBD69]/45 p-6 text-[#FAF7F0] shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#DFBD69]/12 border border-[#DFBD69]/40 flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5 text-[#DFBD69]" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-[#FAF7F0]">
                {t.pairScreenTitle}
              </h2>
              <p className="text-xs text-[#FAF7F0]/70 mt-0.5">{t.pairScreenSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#FAF7F0]/70 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={pairCodeInput}
            onChange={(e) => onChangeCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder={t.pairCodePlaceholder}
            autoFocus
            className="w-full px-4 py-3.5 rounded-xl bg-[#02100B] border border-[#DFBD69]/40 text-center font-mono-numbers text-2xl font-extrabold tracking-[0.35em] text-[#FFE498] placeholder:text-xs placeholder:tracking-normal placeholder:text-[#FAF7F0]/35 focus:outline-none focus:border-[#DFBD69]"
          />

          {pairError && (
            <div className="px-3.5 py-2.5 rounded-xl bg-rose-500/15 border border-rose-400/35 text-rose-200 text-xs font-medium">
              {pairError}
            </div>
          )}

          <button
            type="submit"
            disabled={isPairing || pairCodeInput.length < 6}
            className="w-full py-3 rounded-xl bg-[#DFBD69] text-[#041A12] font-extrabold text-sm tracking-wide disabled:opacity-45 cursor-pointer"
          >
            {isPairing ? '...' : t.pairButtonLabel}
          </button>
        </form>

        {isPaired && (
          <div className="pt-3 border-t border-[#DFBD69]/18 flex items-center justify-between gap-2 text-xs">
            <span className="text-[#FAF7F0]/70 truncate">{monitorName}</span>
            <button
              type="button"
              onClick={onDisconnect}
              className="text-rose-300 hover:text-rose-200 font-semibold cursor-pointer shrink-0"
            >
              {t.pairPreviewButtonLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

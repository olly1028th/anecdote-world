import { useState } from 'react';

export interface ConfirmModalState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

const INITIAL_STATE: ConfirmModalState = {
  open: false,
  title: '',
  message: '',
  onConfirm: () => {},
};

export function useConfirmModal() {
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(INITIAL_STATE);

  const openConfirm = (opts: Omit<ConfirmModalState, 'open'>) => {
    setConfirmModal({ ...opts, open: true });
  };

  const closeConfirm = () => {
    setConfirmModal(INITIAL_STATE);
  };

  return { confirmModal, setConfirmModal, openConfirm, closeConfirm };
}

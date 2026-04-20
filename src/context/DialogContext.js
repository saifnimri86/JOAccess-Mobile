import React, { createContext, useContext, useState, useCallback } from 'react';
import AppDialog from '../components/AppDialog';

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const showDialog = useCallback((title, message, buttons) => {
    setDialog({ title, message: message ?? '', buttons });
  }, []);

  return (
    <DialogContext.Provider value={{ showDialog }}>
      {children}
      {dialog && (
        <AppDialog
          title={dialog.title}
          message={dialog.message}
          buttons={dialog.buttons}
          onDismiss={() => setDialog(null)}
        />
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside DialogProvider');
  return ctx;
}

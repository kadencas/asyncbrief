// src/hooks/use-toast.ts

import * as React from 'react';
import type { Toast } from '@/components/ui/toast';

type ToasterToast = Toast & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
};

const TOAST_LIMIT = 1;

type State = {
  toasts: ToasterToast[];
};

let memoryState: State = { toasts: [] };

const listeners: Array<(state: State) => void> = [];

function dispatch(toast: Omit<ToasterToast, 'id'>) {
  const id = crypto.randomUUID();
  const newToast = { ...toast, id };
  memoryState = {
    ...memoryState,
    toasts: [newToast, ...memoryState.toasts].slice(0, TOAST_LIMIT),
  };
  listeners.forEach((listener) => listener(memoryState));
}

function remove(id: string) {
  memoryState = {
    ...memoryState,
    toasts: memoryState.toasts.filter((t) => t.id !== id),
  };
  listeners.forEach((listener) => listener(memoryState));
}

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, [state]);

  return {
    ...state,
    toast: dispatch,
    dismiss: (id?: string) => {
      if (id) remove(id);
      else memoryState.toasts.forEach((t) => remove(t.id));
    },
  };
}
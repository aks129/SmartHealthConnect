import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connecting to Provider</DialogTitle>
          <DialogDescription>
            You'll be redirected to your healthcare provider to log in.
          </DialogDescription>
        </DialogHeader>
        <div className="text-center p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-700 mb-2">Redirecting to your healthcare provider...</p>
          <p className="text-gray-500 text-sm">You'll be asked to log in and authorize access to your health records.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

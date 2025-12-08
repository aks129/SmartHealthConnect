import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ExternalLink } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function AuthModal({ isOpen, onClose, onConfirm }: AuthModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <DialogTitle>Connect to Health Provider</DialogTitle>
          </div>
          <DialogDescription className="space-y-3">
            <p>
              You are about to be redirected to a secure third-party login page.
            </p>
            <div className="bg-muted/50 p-4 rounded-md text-sm">
              <ul className="list-disc pl-4 space-y-1">
                <li>We do not see or store your password.</li>
                <li>You will control exactly what data is shared.</li>
                <li>Your connection is encrypted and secure.</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              This redirection is required by the <strong>SMART on FHIR</strong> protocol to ensure your privacy.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="gap-2">
            Continue to Login
            <ExternalLink className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

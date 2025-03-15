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
import { AlertCircle } from "lucide-react";

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export function ErrorModal({ isOpen, onClose, message }: ErrorModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Connection Error
          </DialogTitle>
          <DialogDescription>
            There was a problem connecting to your health provider.
          </DialogDescription>
        </DialogHeader>
        <div className="p-2">
          <div className="flex items-center justify-center text-destructive mb-4">
            <AlertCircle className="h-12 w-12" />
          </div>
          <p className="text-gray-700 mb-4 text-center">{message || "Unable to connect to the FHIR server. Please try again."}</p>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} className="w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

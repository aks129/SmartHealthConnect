import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Shield, 
  FileText, 
  Lock, 
  UserCheck, 
  FileOutput, 
  Clock, 
  CheckCircle,
  Server
} from "lucide-react";

export function PrivacyPolicyLink() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="text-sm">Privacy Policy</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span>Privacy Policy</span>
          </DialogTitle>
          <DialogDescription>
            How we handle and protect your health information
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-2">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2 text-primary">
                <Lock className="h-5 w-5" /> 
                Data Security & Privacy
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                We're committed to protecting the privacy and security of your health information. 
                This application implements industry-standard security measures to safeguard your data.
              </p>
              <div className="ml-5 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium">End-to-end encryption:</span> All data transmitted between your device and our servers is encrypted using TLS 1.3.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium">HIPAA compliance:</span> Our systems are designed to meet HIPAA requirements for protected health information.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium">Minimal data collection:</span> We only collect information that's necessary to provide our services.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2 text-primary">
                <UserCheck className="h-5 w-5" /> 
                Information We Collect
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                We collect health information directly from you and, with your permission, from healthcare providers through secure FHIR protocols.
              </p>
              <div className="ml-5 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium">Health records:</span> Including conditions, medications, lab results, and immunizations.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium">Authentication data:</span> Information necessary to verify your identity.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium">Usage information:</span> Data about how you use the application to improve our services.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2 text-primary">
                <FileOutput className="h-5 w-5" /> 
                How We Use Your Information
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Your health information is used exclusively to provide and improve our services. We never sell your data.
              </p>
              <div className="ml-5 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium">Provide services:</span> Display your health information and identify care gaps.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium">Service improvement:</span> Anonymized data analysis to enhance application features.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium">Communication:</span> Send important notifications about your health care.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2 text-primary">
                <Server className="h-5 w-5" /> 
                Data Sharing
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                We share your information only with your explicit consent, except as required by law.
              </p>
              <div className="ml-5 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium">Healthcare providers:</span> With your permission, we may share information with your doctors.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium">Service providers:</span> Third-party services that help us operate (with strict data protection agreements).
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium">Legal requirements:</span> When required by law, court order, or government regulation.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2 text-primary">
                <Clock className="h-5 w-5" /> 
                Data Retention
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                We retain your information only as long as necessary to provide our services or as required by law.
              </p>
              <div className="ml-5 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium">Account deletion:</span> You can request deletion of your account and data at any time.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium">Backups:</span> Data may remain in encrypted backups for a limited time after deletion.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2 text-primary">
                <FileText className="h-5 w-5" /> 
                Your Rights
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                You have control over your health information.
              </p>
              <div className="ml-5 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium">Access:</span> View all your health information collected through the application.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium">Correction:</span> Request corrections to inaccurate information.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium">Deletion:</span> Request deletion of your account and data.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium">Data portability:</span> Download your health information in standard formats.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h3 className="text-md font-semibold mb-2">Contact Information</h3>
              <p className="text-sm text-muted-foreground">
                If you have any questions about our privacy practices, please contact our privacy officer at:
              </p>
              <p className="text-sm font-medium mt-2">privacy@healthconnectapp.example.com</p>
            </div>

            <div className="text-xs text-muted-foreground">
              Last updated: March 16, 2025
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button>I Understand</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PrivacyConsentBanner({ 
  onAccept, 
  onDecline 
}: { 
  onAccept: () => void;
  onDecline: () => void;
}) {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className={`space-y-4 ${showDetails ? 'pb-4' : ''}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Shield className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">Health Data Privacy Consent</h3>
                <p className="text-sm text-muted-foreground">
                  This application collects and processes your health information in accordance with our Privacy Policy.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 md:flex-shrink-0">
              <Button variant="outline" onClick={onDecline}>
                Decline
              </Button>
              <Button onClick={onAccept}>
                Accept
              </Button>
            </div>
          </div>
          
          {showDetails && (
            <div className="text-sm border-t pt-4">
              <p className="mb-2">
                By accepting, you agree to the following:
              </p>
              <ul className="space-y-1 ml-6 list-disc">
                <li>Collection and storage of your health information</li>
                <li>Processing of your data to provide healthcare services</li>
                <li>Secure sharing with healthcare providers with your permission</li>
                <li>Implementation of security measures to protect your data</li>
              </ul>
              <p className="mt-2">
                You can withdraw consent at any time by deleting your account.
              </p>
            </div>
          )}
          
          <Button 
            variant="link" 
            className="text-xs px-0"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? "Show Less" : "Show More Details"}
          </Button>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  AlertTriangle, 
  Shield, 
  Download, 
  Trash2, 
  Lock, 
  Share2, 
  SlidersHorizontal,
  ClipboardList
} from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PrivacyPreferences {
  shareAnonymizedDataForResearch: boolean;
  enableNotifications: boolean;
  enableActivityLogging: boolean;
  enableThirdPartyIntegrations: boolean;
  enableDataEncryption: boolean;
}

interface PrivacySettingsProps {
  onSavePreferences: (preferences: PrivacyPreferences) => void;
  onRequestDataExport: () => void;
  onDeleteAccount: () => void;
}

export function PrivacySettings({ 
  onSavePreferences,
  onRequestDataExport,
  onDeleteAccount 
}: PrivacySettingsProps) {
  // Default privacy settings
  const [preferences, setPreferences] = useState<PrivacyPreferences>({
    shareAnonymizedDataForResearch: false,
    enableNotifications: true,
    enableActivityLogging: true,
    enableThirdPartyIntegrations: false,
    enableDataEncryption: true
  });
  
  // Delete account confirmation
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // Handle preference changes
  const handlePreferenceChange = (key: keyof PrivacyPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Save preferences
  const handleSave = () => {
    onSavePreferences(preferences);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Privacy Settings
        </h2>
        <p className="text-muted-foreground mt-2">
          Manage how your health data is used and shared
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Privacy Preferences
          </CardTitle>
          <CardDescription>
            Control how your data is used within the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="data-encryption" className="flex flex-col space-y-1">
              <span>Data Encryption</span>
              <span className="font-normal text-xs text-muted-foreground">Encrypt sensitive health data for additional security</span>
            </Label>
            <Switch 
              id="data-encryption" 
              checked={preferences.enableDataEncryption}
              onCheckedChange={(checked) => handlePreferenceChange('enableDataEncryption', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="activity-logging" className="flex flex-col space-y-1">
              <span>Activity Logging</span>
              <span className="font-normal text-xs text-muted-foreground">Keep a secure log of actions taken in your account</span>
            </Label>
            <Switch 
              id="activity-logging" 
              checked={preferences.enableActivityLogging}
              onCheckedChange={(checked) => handlePreferenceChange('enableActivityLogging', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="notifications" className="flex flex-col space-y-1">
              <span>Health Notifications</span>
              <span className="font-normal text-xs text-muted-foreground">Receive important health information updates</span>
            </Label>
            <Switch 
              id="notifications" 
              checked={preferences.enableNotifications}
              onCheckedChange={(checked) => handlePreferenceChange('enableNotifications', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="third-party" className="flex flex-col space-y-1">
              <span>Third-party Integrations</span>
              <span className="font-normal text-xs text-muted-foreground">Allow connections to other healthcare services</span>
            </Label>
            <Switch 
              id="third-party" 
              checked={preferences.enableThirdPartyIntegrations}
              onCheckedChange={(checked) => handlePreferenceChange('enableThirdPartyIntegrations', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="research-data" className="flex flex-col space-y-1">
              <span>Research Contribution</span>
              <span className="font-normal text-xs text-muted-foreground">Share anonymized data to improve healthcare research</span>
            </Label>
            <Switch 
              id="research-data" 
              checked={preferences.shareAnonymizedDataForResearch}
              onCheckedChange={(checked) => handlePreferenceChange('shareAnonymizedDataForResearch', checked)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave}>Save Preferences</Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Audit Log Access
          </CardTitle>
          <CardDescription>
            Review who has accessed your health information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We maintain a secure log of all accesses to your health records. You can review this log
            at any time to ensure your information is only being accessed by authorized individuals.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline">View Access Log</Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Export
          </CardTitle>
          <CardDescription>
            Download a copy of your health data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You can download a complete copy of your health data in a standard FHIR format that can be imported into other health applications.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline"
            onClick={onRequestDataExport}
          >
            Request Data Export
          </Button>
        </CardFooter>
      </Card>
      
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Account
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This action will permanently delete your account and all of your health data from our systems. 
            This action cannot be undone.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            variant="destructive"
            onClick={() => setShowDeleteConfirmation(true)}
          >
            Delete Account
          </Button>
        </CardFooter>
      </Card>
      
      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete your account and remove all of your data from our servers.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={onDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
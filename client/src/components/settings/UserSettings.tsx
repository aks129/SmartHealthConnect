import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Camera, User, BellRing, Moon, Sun, Laptop, Eye, EyeOff, ImagePlus } from 'lucide-react';

// Extend schema from database with client validations
const profileFormSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email address" }).optional(),
  profilePicture: z.string().optional(),
});

const themeFormSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
});

const notificationFormSchema = z.object({
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  careGapAlerts: z.boolean().default(true),
  medicationReminders: z.boolean().default(true),
  appointmentReminders: z.boolean().default(true),
  healthSummaries: z.boolean().default(true),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type ThemeFormValues = z.infer<typeof themeFormSchema>;
type NotificationFormValues = z.infer<typeof notificationFormSchema>;

// Mock function for file upload (would connect to server-side API)
async function uploadProfileImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    // Simulate upload and return URL
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  });
}

export function UserSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

  // Fetch current user profile
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['/api/user/profile'],
  });

  // Update user profile
  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormValues) => {
      return apiRequest('/api/user/profile', {
        method: 'PATCH',
        data
      });
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "There was a problem updating your profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update theme settings
  const updateThemeMutation = useMutation({
    mutationFn: (data: ThemeFormValues) => {
      return apiRequest('/api/user/theme', {
        method: 'PATCH',
        data
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Theme Updated",
        description: "Your theme preference has been saved.",
      });
      
      // Apply theme immediately
      const root = window.document.documentElement;
      const theme = data.theme;
      
      if (theme === "dark" || (theme === "system" && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
    }
  });

  // Update notification settings
  const updateNotificationsMutation = useMutation({
    mutationFn: (data: NotificationFormValues) => {
      return apiRequest('/api/user/notifications', {
        method: 'PATCH',
        data
      });
    },
    onSuccess: () => {
      toast({
        title: "Notifications Updated",
        description: "Your notification preferences have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
    }
  });

  // Setup forms with default values
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      profilePicture: user?.profilePicture || "",
    }
  });

  const themeForm = useForm<ThemeFormValues>({
    resolver: zodResolver(themeFormSchema),
    defaultValues: {
      theme: (user?.theme as "light" | "dark" | "system") || "system"
    }
  });

  const notificationForm = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      emailNotifications: user?.notificationPreferences?.emailNotifications ?? true,
      pushNotifications: user?.notificationPreferences?.pushNotifications ?? true,
      careGapAlerts: user?.notificationPreferences?.careGapAlerts ?? true,
      medicationReminders: user?.notificationPreferences?.medicationReminders ?? true,
      appointmentReminders: user?.notificationPreferences?.appointmentReminders ?? true,
      healthSummaries: user?.notificationPreferences?.healthSummaries ?? true,
    }
  });

  // Update form defaults when user data loads
  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        profilePicture: user.profilePicture || "",
      });
      
      themeForm.reset({
        theme: (user.theme as "light" | "dark" | "system") || "system"
      });
      
      notificationForm.reset({
        emailNotifications: user.notificationPreferences?.emailNotifications ?? true,
        pushNotifications: user.notificationPreferences?.pushNotifications ?? true,
        careGapAlerts: user.notificationPreferences?.careGapAlerts ?? true,
        medicationReminders: user.notificationPreferences?.medicationReminders ?? true,
        appointmentReminders: user.notificationPreferences?.appointmentReminders ?? true,
        healthSummaries: user.notificationPreferences?.healthSummaries ?? true,
      });
      
      if (user.profilePicture) {
        setProfileImagePreview(user.profilePicture);
      }
    }
  }, [user, profileForm, themeForm, notificationForm]);

  // Handle profile image upload
  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imageUrl = await uploadProfileImage(file);
        setProfileImagePreview(imageUrl);
        profileForm.setValue('profilePicture', imageUrl);
      } catch (err) {
        toast({
          title: "Upload Failed",
          description: "There was a problem uploading your image. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Submit handlers
  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  const onThemeSubmit = (data: ThemeFormValues) => {
    updateThemeMutation.mutate(data);
  };

  const onNotificationsSubmit = (data: NotificationFormValues) => {
    updateNotificationsMutation.mutate(data);
  };

  // Loading state
  if (userLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Loading your preferences...</CardDescription>
        </CardHeader>
        <CardContent className="h-40 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>
          Manage your account settings and preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full md:w-[400px]">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
        
          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6 py-4">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profileImagePreview || undefined} alt="Profile" />
                  <AvatarFallback>
                    {user?.firstName && user?.lastName 
                      ? `${user.firstName[0]}${user.lastName[0]}` 
                      : <User className="h-12 w-12" />}
                  </AvatarFallback>
                </Avatar>
                <div className="relative">
                  <label htmlFor="profile-image" className="cursor-pointer">
                    <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ImagePlus className="h-4 w-4" />
                      Change Avatar
                    </div>
                    <input 
                      id="profile-image" 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={handleProfileImageChange}
                    />
                  </label>
                </div>
              </div>
              
              <div className="flex-1">
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                      <FormField
                        control={profileForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your first name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your last name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending || !profileForm.formState.isDirty}
                    >
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </Form>
              </div>
            </div>
          </TabsContent>
          
          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6 py-4">
            <Form {...themeForm}>
              <form onSubmit={themeForm.handleSubmit(onThemeSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Theme</h3>
                  <p className="text-sm text-muted-foreground">
                    Select your preferred theme for the application.
                  </p>
                  <Separator />
                  <FormField
                    control={themeForm.control}
                    name="theme"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2"
                          >
                            <div>
                              <RadioGroupItem
                                value="light"
                                id="theme-light"
                                className="peer sr-only"
                                {...field}
                                checked={field.value === "light"}
                              />
                              <label
                                htmlFor="theme-light"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-gray-100 hover:border-gray-300 peer-checked:border-primary [&:has([data-state=checked])]:border-primary"
                              >
                                <Sun className="mb-3 h-6 w-6" />
                                <span className="block w-full text-center font-medium">
                                  Light
                                </span>
                              </label>
                            </div>
                            <div>
                              <RadioGroupItem
                                value="dark"
                                id="theme-dark"
                                className="peer sr-only"
                                {...field}
                                checked={field.value === "dark"}
                              />
                              <label
                                htmlFor="theme-dark"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-gray-100 hover:border-gray-300 peer-checked:border-primary [&:has([data-state=checked])]:border-primary"
                              >
                                <Moon className="mb-3 h-6 w-6" />
                                <span className="block w-full text-center font-medium">
                                  Dark
                                </span>
                              </label>
                            </div>
                            <div>
                              <RadioGroupItem
                                value="system"
                                id="theme-system"
                                className="peer sr-only"
                                {...field}
                                checked={field.value === "system"}
                              />
                              <label
                                htmlFor="theme-system"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-gray-100 hover:border-gray-300 peer-checked:border-primary [&:has([data-state=checked])]:border-primary"
                              >
                                <Laptop className="mb-3 h-6 w-6" />
                                <span className="block w-full text-center font-medium">
                                  System
                                </span>
                              </label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={updateThemeMutation.isPending || !themeForm.formState.isDirty}
                >
                  {updateThemeMutation.isPending ? "Saving..." : "Save Theme"}
                </Button>
              </form>
            </Form>
          </TabsContent>
          
          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6 py-4">
            <Form {...notificationForm}>
              <form onSubmit={notificationForm.handleSubmit(onNotificationsSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Notification Preferences</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure how and when you receive notifications.
                  </p>
                  <Separator />
                  
                  <div className="space-y-4">
                    <FormField
                      control={notificationForm.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 shadow-sm rounded-lg border">
                          <div className="space-y-0.5">
                            <FormLabel>Email Notifications</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Receive notifications via email
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationForm.control}
                      name="pushNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 shadow-sm rounded-lg border">
                          <div className="space-y-0.5">
                            <FormLabel>Push Notifications</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Receive push notifications in your browser
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Separator />
                    <h4 className="text-md font-medium">Health Alerts</h4>
                    
                    <FormField
                      control={notificationForm.control}
                      name="careGapAlerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 shadow-sm rounded-lg border">
                          <div className="space-y-0.5">
                            <FormLabel>Care Gap Alerts</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Notifications about missed screenings or tests
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationForm.control}
                      name="medicationReminders"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 shadow-sm rounded-lg border">
                          <div className="space-y-0.5">
                            <FormLabel>Medication Reminders</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Reminders about medication schedules
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationForm.control}
                      name="appointmentReminders"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 shadow-sm rounded-lg border">
                          <div className="space-y-0.5">
                            <FormLabel>Appointment Reminders</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Reminders about upcoming medical appointments
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationForm.control}
                      name="healthSummaries"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 shadow-sm rounded-lg border">
                          <div className="space-y-0.5">
                            <FormLabel>Health Summaries</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Periodic summaries of your health data and insights
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={updateNotificationsMutation.isPending || !notificationForm.formState.isDirty}
                >
                  {updateNotificationsMutation.isPending ? "Saving..." : "Save Preferences"}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
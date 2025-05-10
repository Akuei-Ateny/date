
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, Bell, Lock, Eye, HelpCircle, MessageCircle, 
  MapPin, Flag, Moon, Heart, LogOut, User, Shield, 
  Smartphone, Globe, Volume2, Zap
} from 'lucide-react';
import Logo from '../components/Logo';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '../contexts/AuthContext';
import { updateUserSettings, deleteAccount } from '../lib/api';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Accordion, AccordionContent, AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [showActive, setShowActive] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [dataUsage, setDataUsage] = useState('auto');
  const [matchAlert, setMatchAlert] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [language, setLanguage] = useState('english');
  const [isLoading, setIsLoading] = useState(false);
  
  // Determine where the back button should go
  const handleBack = () => {
    // If we have a state with a previous path, use that
    if (location.state && location.state.from) {
      navigate(location.state.from);
    } else {
      // Default is profile
      navigate('/profile');
    }
  };

  // Save settings changes
  const handleSettingChange = async (setting: string, value: boolean | string) => {
    try {
      setIsLoading(true);
      // Update local state
      switch (setting) {
        case 'notifications':
          setNotifications(value as boolean);
          break;
        case 'messageNotifications':
          setMessageNotifications(value as boolean);
          break;
        case 'locationEnabled':
          setLocationEnabled(value as boolean);
          break;
        case 'showActive':
          setShowActive(value as boolean);
          break;
        case 'darkMode':
          setDarkMode(value as boolean);
          break;
        case 'matchAlert':
          setMatchAlert(value as boolean);
          break;
        case 'vibration':
          setVibration(value as boolean);
          break;
        case 'soundEffects':
          setSoundEffects(value as boolean);
          break;
        case 'language':
          setLanguage(value as string);
          break;
        case 'dataUsage':
          setDataUsage(value as string);
          break;
        default:
          break;
      }
      
      // Call API to update user settings
      await updateUserSettings({ [setting]: value });
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    try {
      setIsLoading(true);
      await deleteAccount();
      await signOut();
      navigate('/');
      toast.success('Account deleted successfully');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // In a real app, you would fetch user settings here
    // For now, we'll just set some defaults
    if (user) {
      setNotifications(user.settings?.notifications ?? true);
      setMessageNotifications(user.settings?.messageNotifications ?? true);
      setLocationEnabled(user.settings?.locationEnabled ?? true);
      setShowActive(user.settings?.showActive ?? true);
      setDarkMode(user.settings?.darkMode ?? false);
      setMatchAlert(user.settings?.matchAlert ?? true);
      setVibration(user.settings?.vibration ?? true);
      setSoundEffects(user.settings?.soundEffects ?? true);
      setLanguage(user.settings?.language ?? 'english');
      setDataUsage(user.settings?.dataUsage ?? 'auto');
    }
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-black to-[#121212] text-princeton-white">
      <header className="sticky top-0 z-10 backdrop-blur-lg bg-black/30 px-4 py-4 flex justify-between items-center border-b border-white/10">
        <div className="flex items-center">
          <button 
            onClick={handleBack}
            className="text-princeton-white hover:text-princeton-orange transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
          </button>
        </div>
        
        <h1 className="text-xl font-bold text-princeton-white">Settings</h1>
        <div className="w-6"></div> {/* Empty div for spacing */}
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-md">
        <div className="space-y-6">
          {/* Profile Section */}
          <div className="bg-secondary/30 rounded-xl p-4 border border-white/5">
            <div className="flex items-center space-x-4 mb-4">
              {user?.photo_urls && user.photo_urls[0] ? (
                <div className="h-20 w-20 rounded-full overflow-hidden">
                  <img 
                    src={user.photo_urls[0]} 
                    alt={user.name} 
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-20 w-20 rounded-full bg-princeton-orange/30 flex items-center justify-center">
                  <User size={32} className="text-princeton-orange" />
                </div>
              )}
              
              <div>
                <h2 className="text-lg font-semibold">{user?.name || 'User'}</h2>
                <p className="text-princeton-white/70 text-sm">{user?.email || ''}</p>
                <Button 
                  variant="link" 
                  onClick={() => navigate('/profile')}
                  className="text-princeton-orange p-0 h-auto text-sm"
                >
                  View profile
                </Button>
              </div>
            </div>
            
            <Button 
              onClick={() => navigate('/profile')}
              variant="outline" 
              className="w-full border-princeton-orange/40 text-princeton-white"
            >
              <User size={18} className="mr-2 text-princeton-orange" />
              Edit Profile
            </Button>
          </div>
          
          {/* Settings Categories */}
          <Accordion type="single" collapsible className="space-y-4">
            {/* Account */}
            <AccordionItem value="account" className="rounded-xl overflow-hidden bg-secondary/30 border border-white/5">
              <AccordionTrigger className="px-4 py-2 hover:bg-white/5">
                <div className="flex items-center">
                  <Shield size={20} className="text-princeton-orange mr-3" />
                  <span className="font-medium">Account</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="bg-secondary/20">
                <div className="space-y-2 p-4">
                  <div 
                    className="flex items-center justify-between py-2 cursor-pointer hover:bg-white/5 rounded-lg px-2"
                    onClick={() => navigate('/profile')}
                  >
                    <div className="flex items-center">
                      <Eye size={18} className="text-princeton-orange mr-3" />
                      <span className="text-princeton-white">Edit Profile</span>
                    </div>
                    <ArrowLeft size={18} className="text-princeton-white/60 transform rotate-180" />
                  </div>
                  
                  <div 
                    className="flex items-center justify-between py-2 cursor-pointer hover:bg-white/5 rounded-lg px-2"
                    onClick={() => navigate('/settings/password')}
                  >
                    <div className="flex items-center">
                      <Lock size={18} className="text-princeton-orange mr-3" />
                      <span className="text-princeton-white">Change Password</span>
                    </div>
                    <ArrowLeft size={18} className="text-princeton-white/60 transform rotate-180" />
                  </div>

                  <div 
                    className="flex items-center justify-between py-2 cursor-pointer hover:bg-white/5 rounded-lg px-2"
                    onClick={handleLogout}
                  >
                    <div className="flex items-center">
                      <LogOut size={18} className="text-princeton-orange mr-3" />
                      <span className="text-princeton-white">Logout</span>
                    </div>
                    <ArrowLeft size={18} className="text-princeton-white/60 transform rotate-180" />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            {/* Notifications */}
            <AccordionItem value="notifications" className="rounded-xl overflow-hidden bg-secondary/30 border border-white/5">
              <AccordionTrigger className="px-4 py-2 hover:bg-white/5">
                <div className="flex items-center">
                  <Bell size={20} className="text-princeton-orange mr-3" />
                  <span className="font-medium">Notifications</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="bg-secondary/20">
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <Bell size={18} className="text-princeton-orange mr-3" />
                      <span className="text-princeton-white">Push Notifications</span>
                    </div>
                    <Switch 
                      checked={notifications}
                      onCheckedChange={(value) => handleSettingChange('notifications', value)}
                      disabled={isLoading}
                      className="data-[state=checked]:bg-princeton-orange"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <MessageCircle size={18} className="text-princeton-orange mr-3" />
                      <span className="text-princeton-white">Message Notifications</span>
                    </div>
                    <Switch 
                      checked={messageNotifications}
                      onCheckedChange={(value) => handleSettingChange('messageNotifications', value)}
                      disabled={isLoading}
                      className="data-[state=checked]:bg-princeton-orange"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <Heart size={18} className="text-princeton-orange mr-3" />
                      <span className="text-princeton-white">Match Alerts</span>
                    </div>
                    <Switch 
                      checked={matchAlert}
                      onCheckedChange={(value) => handleSettingChange('matchAlert', value)}
                      disabled={isLoading}
                      className="data-[state=checked]:bg-princeton-orange"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            {/* Privacy */}
            <AccordionItem value="privacy" className="rounded-xl overflow-hidden bg-secondary/30 border border-white/5">
              <AccordionTrigger className="px-4 py-2 hover:bg-white/5">
                <div className="flex items-center">
                  <Shield size={20} className="text-princeton-orange mr-3" />
                  <span className="font-medium">Privacy</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="bg-secondary/20">
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <MapPin size={18} className="text-princeton-orange mr-3" />
                      <span className="text-princeton-white">Location Services</span>
                    </div>
                    <Switch 
                      checked={locationEnabled}
                      onCheckedChange={(value) => handleSettingChange('locationEnabled', value)}
                      disabled={isLoading}
                      className="data-[state=checked]:bg-princeton-orange"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <Eye size={18} className="text-princeton-orange mr-3" />
                      <span className="text-princeton-white">Show Active Status</span>
                    </div>
                    <Switch 
                      checked={showActive}
                      onCheckedChange={(value) => handleSettingChange('showActive', value)}
                      disabled={isLoading}
                      className="data-[state=checked]:bg-princeton-orange"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            {/* Appearance */}
            <AccordionItem value="appearance" className="rounded-xl overflow-hidden bg-secondary/30 border border-white/5">
              <AccordionTrigger className="px-4 py-2 hover:bg-white/5">
                <div className="flex items-center">
                  <Moon size={20} className="text-princeton-orange mr-3" />
                  <span className="font-medium">Appearance</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="bg-secondary/20">
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <Moon size={18} className="text-princeton-orange mr-3" />
                      <span className="text-princeton-white">Dark Mode</span>
                    </div>
                    <Switch 
                      checked={darkMode}
                      onCheckedChange={(value) => handleSettingChange('darkMode', value)}
                      disabled={isLoading}
                      className="data-[state=checked]:bg-princeton-orange"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            {/* App Preferences */}
            <AccordionItem value="preferences" className="rounded-xl overflow-hidden bg-secondary/30 border border-white/5">
              <AccordionTrigger className="px-4 py-2 hover:bg-white/5">
                <div className="flex items-center">
                  <Smartphone size={20} className="text-princeton-orange mr-3" />
                  <span className="font-medium">App Preferences</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="bg-secondary/20">
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <Zap size={18} className="text-princeton-orange mr-3" />
                      <span className="text-princeton-white">Vibration</span>
                    </div>
                    <Switch 
                      checked={vibration}
                      onCheckedChange={(value) => handleSettingChange('vibration', value)}
                      disabled={isLoading}
                      className="data-[state=checked]:bg-princeton-orange"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <Volume2 size={18} className="text-princeton-orange mr-3" />
                      <span className="text-princeton-white">Sound Effects</span>
                    </div>
                    <Switch 
                      checked={soundEffects}
                      onCheckedChange={(value) => handleSettingChange('soundEffects', value)}
                      disabled={isLoading}
                      className="data-[state=checked]:bg-princeton-orange"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            {/* Help & Support */}
            <AccordionItem value="help" className="rounded-xl overflow-hidden bg-secondary/30 border border-white/5">
              <AccordionTrigger className="px-4 py-2 hover:bg-white/5">
                <div className="flex items-center">
                  <HelpCircle size={20} className="text-princeton-orange mr-3" />
                  <span className="font-medium">Help & Support</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="bg-secondary/20">
                <div className="space-y-2 p-4">
                  <div 
                    className="flex items-center justify-between py-2 cursor-pointer hover:bg-white/5 rounded-lg px-2"
                    onClick={() => navigate('/help')}
                  >
                    <div className="flex items-center">
                      <HelpCircle size={18} className="text-princeton-orange mr-3" />
                      <span className="text-princeton-white">Help Center</span>
                    </div>
                    <ArrowLeft size={18} className="text-princeton-white/60 transform rotate-180" />
                  </div>
                  
                  <div 
                    className="flex items-center justify-between py-2 cursor-pointer hover:bg-white/5 rounded-lg px-2"
                    onClick={() => navigate('/report')}
                  >
                    <div className="flex items-center">
                      <Flag size={18} className="text-princeton-orange mr-3" />
                      <span className="text-princeton-white">Report a Problem</span>
                    </div>
                    <ArrowLeft size={18} className="text-princeton-white/60 transform rotate-180" />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Delete Account */}
          <div className="bg-secondary/30 rounded-xl p-4 border border-white/5">
            <h2 className="text-lg font-semibold text-red-500 mb-4">Danger Zone</h2>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="w-full bg-red-500 hover:bg-red-600"
                >
                  Delete Account
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-secondary border-princeton-orange/20">
                <DialogHeader>
                  <DialogTitle className="text-princeton-white">Are you absolutely sure?</DialogTitle>
                  <DialogDescription className="text-princeton-white/70">
                    This action cannot be undone. This will permanently delete your account and remove all of your data from our servers.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => handleDeleteAccount()}
                    disabled={isLoading}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    {isLoading ? 'Deleting...' : 'Yes, Delete My Account'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* App version */}
          <div className="text-center text-xs text-princeton-white/50 mt-4">
            Me&Union v1.0.0
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;

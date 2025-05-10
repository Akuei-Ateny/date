
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getCurrentUser, getUserById, updateUserProfile, uploadUserPhoto, deleteUserPhoto, updateUserInterests } from '../lib/api';
import { ArrowLeft, Camera, Trash2, Settings, Edit, Save, X, Heart, Calendar, School, MapPin, Sparkles, BookOpen } from 'lucide-react';
import Logo from '../components/Logo';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import InterestSelector from '@/components/InterestSelector';
import { UserVibe } from '@/types/database';

interface UserProfileProps {
  viewUserId?: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ viewUserId }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('basic');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  
  // Form state
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [major, setMajor] = useState('');
  const [classYear, setClassYear] = useState('');
  const [gender, setGender] = useState<string>('');
  const [genderPreference, setGenderPreference] = useState<string>('');
  const [vibe, setVibe] = useState<string>('');
  const [intention, setIntention] = useState<string>('casual');
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  
  // Fetch user data - either current user or viewed user
  const { data: user, isLoading, error } = useQuery({
    queryKey: viewUserId ? ['user', viewUserId] : ['currentUser'],
    queryFn: () => viewUserId ? getUserById(viewUserId) : getCurrentUser(),
    meta: {
      onError: (error: any) => {
        toast.error(`Failed to load profile: ${error.message}`);
      }
    }
  });
  
  // Update state when user data changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setMajor(user.major || '');
      setClassYear(user.class_year || '');
      setGender(user.gender || '');
      setGenderPreference(user.gender_preference || '');
      setVibe(user.vibe || '');
      setIntention(user.intention || 'casual');
      setPhotos(user.photo_urls || []);
      
      // Extract interest IDs from the nested structure
      const interestIds = user.interests?.map(interest => {
        if (interest.name && interest.name.id) {
          return interest.name.id;
        }
        return '';
      }).filter(Boolean) || [];
      
      setSelectedInterests(interestIds);
    }
  }, [user]);
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (profileData: any) => updateUserProfile(profileData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Profile updated successfully');
      setIsEditMode(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to update profile: ${error.message}`);
    }
  });
  
  // Update interests mutation
  const updateInterestsMutation = useMutation({
    mutationFn: (interestIds: string[]) => updateUserInterests(interestIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Interests updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update interests: ${error.message}`);
    }
  });
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const profileData = {
      name,
      bio,
      major,
      class_year: classYear,
      gender,
      gender_preference: genderPreference,
      vibe,
      intention,
      profile_complete: true
    };
    
    updateProfileMutation.mutate(profileData);
  };
  
  // Handle interests update
  const handleInterestsUpdate = () => {
    updateInterestsMutation.mutate(selectedInterests);
  };
  
  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB');
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files are allowed');
      return;
    }
    
    setIsUploading(true);
    setUploadError(null);
    
    try {
      // Use the File object directly with the API function
      const uploadedPhotoUrl = await uploadUserPhoto(file);
      
      // Update the photos array with the new photo URL
      setPhotos(prevPhotos => [...prevPhotos, uploadedPhotoUrl]);
      
      setIsUploading(false);
      toast.success('Photo uploaded successfully');
    } catch (error: any) {
      setIsUploading(false);
      setUploadError(error.message);
      toast.error('Failed to upload photo');
    }
  };
  
  // Handle photo deletion
  const handleDeletePhoto = async (photoUrl: string) => {
    try {
      await deleteUserPhoto(photoUrl);
      // Update local state by filtering out the deleted photo
      setPhotos(prevPhotos => prevPhotos.filter(url => url !== photoUrl));
      toast.success('Photo deleted successfully');
    } catch (error: any) {
      toast.error(`Failed to delete photo: ${error.message}`);
    }
  };
  
  // Viewing another user's profile or own profile
  const isViewingOtherUser = !!viewUserId;
  
  // Switch between photos in view mode
  const nextPhoto = () => {
    if (photos.length > 1) {
      setActivePhotoIndex((prev) => (prev + 1) % photos.length);
    }
  };
  
  const prevPhoto = () => {
    if (photos.length > 1) {
      setActivePhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-[#121212] p-4">
        <header className="container mx-auto px-4 py-4 flex items-center">
          <button 
            onClick={() => navigate(-1)}
            className="text-princeton-white hover:text-princeton-orange transition-colors mr-4"
          >
            <ArrowLeft size={24} />
          </button>
          <Logo />
        </header>
        
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-princeton-white">{isViewingOtherUser ? 'Profile' : 'Your Profile'}</h1>
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-80 w-full rounded-xl" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </main>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-[#121212] p-4">
        <header className="container mx-auto px-4 py-4 flex items-center">
          <button 
            onClick={() => navigate(-1)}
            className="text-princeton-white hover:text-princeton-orange transition-colors mr-4"
          >
            <ArrowLeft size={24} />
          </button>
          <Logo />
        </header>
        
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="text-center py-10">
            <div className="text-red-500 mb-2">Failed to load profile</div>
            <button 
              onClick={() => queryClient.invalidateQueries({ queryKey: viewUserId ? ['user', viewUserId] : ['currentUser'] })}
              className="text-princeton-orange underline"
            >
              Try again
            </button>
          </div>
        </main>
      </div>
    );
  }
  
  // View mode for other users' profiles
  if (isViewingOtherUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-[#121212] p-4">
        <header className="container mx-auto px-4 py-4 flex items-center">
          <button 
            onClick={() => navigate(-1)}
            className="text-princeton-white hover:text-princeton-orange transition-colors mr-4"
          >
            <ArrowLeft size={24} />
          </button>
          <Logo />
        </header>
        
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          <h1 className="text-2xl font-bold text-princeton-white mb-6">{name}'s Profile</h1>
          
          {/* Photo Gallery with Navigation */}
          {photos && photos.length > 0 && (
            <div className="mb-8 relative">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden mb-4 shadow-lg">
                <img 
                  src={photos[activePhotoIndex]} 
                  alt={name} 
                  className="w-full h-full object-cover"
                />
              </div>
              
              {photos.length > 1 && (
                <div className="absolute top-1/2 left-0 right-0 flex justify-between px-4 -translate-y-1/2">
                  <button onClick={prevPhoto} className="bg-black/30 hover:bg-black/50 p-2 rounded-full">
                    <ArrowLeft size={24} className="text-white" />
                  </button>
                  <button onClick={nextPhoto} className="bg-black/30 hover:bg-black/50 p-2 rounded-full">
                    <ArrowLeft size={24} className="text-white transform rotate-180" />
                  </button>
                </div>
              )}
              
              {/* Photo indicators */}
              {photos.length > 1 && (
                <div className="flex justify-center gap-1 mt-2">
                  {photos.map((_, index) => (
                    <div 
                      key={index} 
                      className={`h-2 rounded-full transition-all ${
                        index === activePhotoIndex ? 'w-6 bg-princeton-orange' : 'w-2 bg-gray-500'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Basic info card with modern design */}
          <div className="mb-8">
            <div className="bg-secondary/80 backdrop-blur rounded-2xl p-6 text-princeton-white shadow-lg border border-white/10">
              <div className="mb-6 flex items-center space-x-2">
                <Heart size={20} className="text-princeton-orange" />
                <h2 className="text-xl font-bold text-princeton-white">About {name}</h2>
              </div>
              
              <div className="space-y-6">
                {/* Bio */}
                <div className="bg-white/5 p-4 rounded-xl">
                  <p className="text-princeton-white/90 italic">"{bio || 'No bio provided'}"</p>
                </div>
                
                {/* Details grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <School className="text-princeton-orange" size={18} />
                    <div>
                      <p className="text-xs text-princeton-white/60">Major</p>
                      <p className="font-medium">{major || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Calendar className="text-princeton-orange" size={18} />
                    <div>
                      <p className="text-xs text-princeton-white/60">Class Year</p>
                      <p className="font-medium">{classYear || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Sparkles className="text-princeton-orange" size={18} />
                    <div>
                      <p className="text-xs text-princeton-white/60">Vibe</p>
                      <p className="font-medium">{vibe || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Heart className="text-princeton-orange" size={18} />
                    <div>
                      <p className="text-xs text-princeton-white/60">Intention</p>
                      <p className="font-medium">
                        {intention ? (intention === 'casual' ? 'Casual' : 'Serious') : 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Interests */}
          <div className="mb-8">
            <div className="bg-secondary/80 backdrop-blur rounded-2xl p-6 text-princeton-white shadow-lg border border-white/10">
              <div className="mb-4 flex items-center space-x-2">
                <BookOpen size={20} className="text-princeton-orange" />
                <h2 className="text-xl font-bold text-princeton-white">Interests</h2>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {user?.interests && user.interests.length > 0 ? (
                  user.interests.map((interest, index) => (
                    <Badge key={index} className="bg-princeton-orange/70 text-black px-3 py-1 rounded-full">
                      {interest.name.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-princeton-white/60">No interests listed</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Clubs */}
          <div className="mb-6">
            <div className="bg-secondary/80 backdrop-blur rounded-2xl p-6 text-princeton-white shadow-lg border border-white/10">
              <div className="mb-4 flex items-center space-x-2">
                <MapPin size={20} className="text-princeton-orange" />
                <h2 className="text-xl font-bold text-princeton-white">Clubs</h2>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {user?.clubs && user.clubs.length > 0 ? (
                  user.clubs.map((club, index) => (
                    <Badge key={index} variant="outline" className="border-princeton-orange text-princeton-white px-3 py-1 rounded-full">
                      {club.name.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-princeton-white/60">No clubs listed</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  // Own profile - View/Edit mode toggle
  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-[#121212] p-4">
      <header className="container mx-auto px-4 py-4 flex items-center">
        <button 
          onClick={() => navigate(-1)}
          className="text-princeton-white hover:text-princeton-orange transition-colors mr-4"
        >
          <ArrowLeft size={24} />
        </button>
        <Logo />
      </header>
      
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-princeton-white">Your Profile</h1>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => navigate('/settings')}
              className="border-princeton-orange/40 text-princeton-white"
            >
              <Settings size={18} className="mr-2" />
              Settings
            </Button>
            
            <Button
              onClick={() => setIsEditMode(!isEditMode)}
              className={isEditMode ? "bg-gray-600" : "bg-princeton-orange text-black"}
            >
              {isEditMode ? (
                <>
                  <X size={18} className="mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit size={18} className="mr-2" />
                  Edit Profile
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* View Mode */}
        {!isEditMode ? (
          <div className="space-y-8 animate-fade-in">
            {/* Photo Gallery with Navigation */}
            {photos && photos.length > 0 ? (
              <div className="relative">
                <div className="aspect-[4/5] rounded-2xl overflow-hidden mb-4 shadow-lg">
                  <img 
                    src={photos[activePhotoIndex]} 
                    alt={name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {photos.length > 1 && (
                  <div className="absolute top-1/2 left-0 right-0 flex justify-between px-4 -translate-y-1/2">
                    <button onClick={prevPhoto} className="bg-black/30 hover:bg-black/50 p-2 rounded-full">
                      <ArrowLeft size={24} className="text-white" />
                    </button>
                    <button onClick={nextPhoto} className="bg-black/30 hover:bg-black/50 p-2 rounded-full">
                      <ArrowLeft size={24} className="text-white transform rotate-180" />
                    </button>
                  </div>
                )}
                
                {/* Photo indicators */}
                {photos.length > 1 && (
                  <div className="flex justify-center gap-1 mt-2">
                    {photos.map((_, index) => (
                      <div 
                        key={index} 
                        className={`h-2 rounded-full transition-all ${
                          index === activePhotoIndex ? 'w-6 bg-princeton-orange' : 'w-2 bg-gray-500'
                        }`}
                      />
                    ))}
                  </div>
                )}
                
                {/* Thumbnail gallery */}
                {photos.length > 1 && (
                  <div className="grid grid-cols-5 gap-2 mt-4">
                    {photos.map((photo, index) => (
                      <div 
                        key={index}
                        className={`aspect-square rounded-lg overflow-hidden cursor-pointer ${
                          index === activePhotoIndex ? 'ring-2 ring-princeton-orange' : ''
                        }`}
                        onClick={() => setActivePhotoIndex(index)}
                      >
                        <img 
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-[4/5] rounded-2xl border-2 border-dashed border-princeton-orange/40 flex flex-col items-center justify-center">
                <Camera size={64} className="text-princeton-orange/40 mb-4" />
                <p className="text-princeton-white/60">No photos added yet</p>
              </div>
            )}
            
            {/* Basic info card with modern design */}
            <div className="bg-secondary/80 backdrop-blur rounded-2xl p-6 text-princeton-white shadow-lg border border-white/10">
              <div className="mb-6 flex items-center space-x-2">
                <Heart size={20} className="text-princeton-orange" />
                <h2 className="text-xl font-bold text-princeton-white">About You</h2>
              </div>
              
              <div className="space-y-6">
                {/* Bio */}
                <div className="bg-white/5 p-4 rounded-xl">
                  <p className="text-princeton-white/90 italic">"{bio || 'No bio provided'}"</p>
                </div>
                
                {/* Details grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <School className="text-princeton-orange" size={18} />
                    <div>
                      <p className="text-xs text-princeton-white/60">Major</p>
                      <p className="font-medium">{major || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Calendar className="text-princeton-orange" size={18} />
                    <div>
                      <p className="text-xs text-princeton-white/60">Class Year</p>
                      <p className="font-medium">{classYear || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Sparkles className="text-princeton-orange" size={18} />
                    <div>
                      <p className="text-xs text-princeton-white/60">Vibe</p>
                      <p className="font-medium">{vibe || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Heart className="text-princeton-orange" size={18} />
                    <div>
                      <p className="text-xs text-princeton-white/60">Intention</p>
                      <p className="font-medium">
                        {intention ? (intention === 'casual' ? 'Casual' : 'Serious') : 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Interests */}
            <div className="bg-secondary/80 backdrop-blur rounded-2xl p-6 text-princeton-white shadow-lg border border-white/10">
              <div className="mb-4 flex items-center space-x-2">
                <BookOpen size={20} className="text-princeton-orange" />
                <h2 className="text-xl font-bold text-princeton-white">Interests</h2>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {user?.interests && user.interests.length > 0 ? (
                  user.interests.map((interest, index) => (
                    <Badge key={index} className="bg-princeton-orange/70 text-black px-3 py-1 rounded-full">
                      {interest.name.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-princeton-white/60">No interests listed</p>
                )}
              </div>
            </div>
            
            {/* Clubs */}
            <div className="bg-secondary/80 backdrop-blur rounded-2xl p-6 text-princeton-white shadow-lg border border-white/10">
              <div className="mb-4 flex items-center space-x-2">
                <MapPin size={20} className="text-princeton-orange" />
                <h2 className="text-xl font-bold text-princeton-white">Clubs</h2>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {user?.clubs && user.clubs.length > 0 ? (
                  user.clubs.map((club, index) => (
                    <Badge key={index} variant="outline" className="border-princeton-orange text-princeton-white px-3 py-1 rounded-full">
                      {club.name.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-princeton-white/60">No clubs listed</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Edit Mode */
          <div className="animate-fade-in">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="photos">Photos</TabsTrigger>
                <TabsTrigger value="interests">Interests</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-princeton-white">Name</Label>
                    <Input 
                      id="name" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      className="bg-secondary border-princeton-orange/30 text-princeton-white"
                      placeholder="Your name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-princeton-white">Bio</Label>
                    <Textarea 
                      id="bio" 
                      value={bio} 
                      onChange={(e) => setBio(e.target.value)} 
                      className="bg-secondary border-princeton-orange/30 text-princeton-white min-h-[100px]"
                      placeholder="Tell others about yourself"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="major" className="text-princeton-white">Major</Label>
                    <Input 
                      id="major" 
                      value={major} 
                      onChange={(e) => setMajor(e.target.value)} 
                      className="bg-secondary border-princeton-orange/30 text-princeton-white"
                      placeholder="Your major"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="classYear" className="text-princeton-white">Class Year</Label>
                    <Select value={classYear} onValueChange={setClassYear}>
                      <SelectTrigger className="bg-secondary border-princeton-orange/30 text-princeton-white">
                        <SelectValue placeholder="Select your class year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                        <SelectItem value="2027">2027</SelectItem>
                        <SelectItem value="2028">2028</SelectItem>
                        <SelectItem value="Graduate">Graduate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-princeton-white">Gender</Label>
                    <RadioGroup value={gender} onValueChange={setGender} className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="male" />
                        <Label htmlFor="male" className="text-princeton-white">Male</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="female" />
                        <Label htmlFor="female" className="text-princeton-white">Female</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="non-binary" id="non-binary" />
                        <Label htmlFor="non-binary" className="text-princeton-white">Non-binary</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="other" id="other" />
                        <Label htmlFor="other" className="text-princeton-white">Other</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-princeton-white">Interested In</Label>
                    <RadioGroup value={genderPreference} onValueChange={setGenderPreference} className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="pref-male" />
                        <Label htmlFor="pref-male" className="text-princeton-white">Men</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="pref-female" />
                        <Label htmlFor="pref-female" className="text-princeton-white">Women</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="everyone" id="pref-everyone" />
                        <Label htmlFor="pref-everyone" className="text-princeton-white">Everyone</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-princeton-white">Dating Intention</Label>
                    <RadioGroup value={intention} onValueChange={setIntention} className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="casual" id="casual" />
                        <Label htmlFor="casual" className="text-princeton-white">Casual</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="serious" id="serious" />
                        <Label htmlFor="serious" className="text-princeton-white">Serious</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-princeton-orange hover:bg-princeton-orange/90 text-black"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-2 border-2 border-black border-t-transparent rounded-full"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="photos">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                        <img 
                          src={photo} 
                          alt={`Profile photo ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => handleDeletePhoto(photo)}
                          className="absolute top-2 right-2 bg-black/50 p-2 rounded-full text-white hover:bg-red-500/80"
                          aria-label="Delete photo"
                        >
                          <Trash2 size={18} />
                        </button>
                        
                        {index === 0 && (
                          <div className="absolute bottom-2 left-2 bg-princeton-orange/80 text-xs text-white px-2 py-1 rounded-md">
                            Main Photo
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {photos.length < 6 && (
                      <label className="aspect-square rounded-lg border-2 border-dashed border-princeton-orange/50 flex flex-col items-center justify-center cursor-pointer hover:bg-princeton-orange/10 transition-colors">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handlePhotoUpload}
                          disabled={isUploading}
                        />
                        {isUploading ? (
                          <div className="animate-spin h-8 w-8 border-2 border-princeton-orange border-t-transparent rounded-full"></div>
                        ) : (
                          <>
                            <Camera size={32} className="text-princeton-orange mb-2" />
                            <span className="text-sm text-princeton-orange">Add Photo</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                  
                  {uploadError && (
                    <div className="text-red-500 text-sm p-2 bg-red-500/10 rounded-lg">
                      {uploadError}
                    </div>
                  )}
                  
                  <div className="text-sm text-princeton-white/70 p-4 bg-white/5 rounded-lg">
                    <p>• Add up to 6 photos to show off your best self.</p>
                    <p>• First photo will be your main profile picture.</p>
                    <p>• Maximum file size: 5MB.</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="interests">
                <div className="space-y-6">
                  <div className="bg-secondary/30 p-4 rounded-lg text-princeton-white/90 text-sm">
                    Select interests that represent you. These will help match you with people who share similar interests.
                  </div>
                  
                  <InterestSelector 
                    selectedInterests={selectedInterests}
                    onChange={setSelectedInterests}
                  />
                  
                  <Button 
                    onClick={handleInterestsUpdate}
                    className="w-full bg-princeton-orange hover:bg-princeton-orange/90 text-black"
                    disabled={updateInterestsMutation.isPending}
                  >
                    {updateInterestsMutation.isPending ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-2 border-2 border-black border-t-transparent rounded-full"></div>
                        Saving...
                      </>
                    ) : (
                      'Save Interests'
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
};

export default UserProfile;

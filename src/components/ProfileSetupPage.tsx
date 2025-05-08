import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { ArrowLeft, ArrowRight, Upload, X, MapPin, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { UserGender, GenderPreference, UserVibe, CampusBuilding } from '@/types/database';

type Step = 'basics' | 'photos' | 'interests' | 'gender' | 'location' | 'review';

interface VibeOption {
  id: string;
  label: UserVibe;
  emoji: string;
}

const vibeOptions: VibeOption[] = [
  { id: 'party', label: 'Looking to Party', emoji: '🍻' },
  { id: 'catch-up', label: 'Looking to Catch Up', emoji: '💬' },
  { id: 'roam', label: 'Down to Roam', emoji: '🧡' },
  { id: 'hook-up', label: 'Looking for a Hook-Up', emoji: '❤️' },
];

const genderOptions: { value: UserGender, label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' }
];

const preferenceOptions: { value: GenderPreference, label: string }[] = [
  { value: 'male', label: 'Men' },
  { value: 'female', label: 'Women' },
  { value: 'everyone', label: 'Everyone' }
];

const MAX_PHOTOS = 6;
const MAX_PHOTO_SIZE_MB = 5;
const MAX_INTERESTS = 5;
const MAX_CLUBS = 3;

const ProfileSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { setProfileComplete } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('basics');
  const [stepNumber, setStepNumber] = useState<number>(1);
  const totalSteps = 6;

  // Basic info
  const [name, setName] = useState<string>('');
  const [classYear, setClassYear] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [major, setMajor] = useState<string>('');
  
  // Photos
  const [photos, setPhotos] = useState<{url: string, file: File}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Vibe and gender
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const [gender, setGender] = useState<UserGender | ''>('');
  const [genderPreference, setGenderPreference] = useState<GenderPreference>('everyone');
  
  // Interests and clubs
  const [availableInterests, setAvailableInterests] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [availableClubs, setAvailableClubs] = useState<string[]>([]);
  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState<string>('');
  
  // Location
  const [buildings, setBuildings] = useState<CampusBuilding[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<CampusBuilding | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Fetch available interests and clubs on component mount
  useEffect(() => {
    const fetchInterestsAndClubs = async () => {
      try {
        // Fetch interests
        const { data: interestsData, error: interestsError } = await supabase
          .from('interests')
          .select('name')
          .order('name');
        
        if (interestsError) throw interestsError;
        setAvailableInterests(interestsData.map(interest => interest.name));
        
        // Fetch clubs
        const { data: clubsData, error: clubsError } = await supabase
          .from('clubs')
          .select('name')
          .order('name');
        
        if (clubsError) throw clubsError;
        setAvailableClubs(clubsData.map(club => club.name));
        
        // Fetch buildings
        const { data: buildingsData, error: buildingsError } = await supabase
          .from('campus_buildings')
          .select('*')
          .order('name');
        
        if (buildingsError) throw buildingsError;
        setBuildings(buildingsData);
        
      } catch (error) {
        console.error('Error fetching options:', error);
        toast.error('Failed to load options');
      }
    };
    
    fetchInterestsAndClubs();
  }, []);

  const handleContinue = () => {
    // Validate current step
    if (currentStep === 'basics') {
      if (!name || !classYear || !major) {
        toast.error('Please fill out all required fields');
        return;
      }
      setCurrentStep('photos');
      setStepNumber(2);
    } else if (currentStep === 'photos') {
      if (photos.length === 0) {
        toast.error('Please add at least one photo');
        return;
      }
      setCurrentStep('gender');
      setStepNumber(3);
    } else if (currentStep === 'gender') {
      if (!gender || !selectedVibe) {
        toast.error('Please select your gender and vibe');
        return;
      }
      setCurrentStep('interests');
      setStepNumber(4);
    } else if (currentStep === 'interests') {
      if (selectedInterests.length === 0 || selectedClubs.length === 0) {
        toast.error('Please select at least one interest and one club');
        return;
      }
      setCurrentStep('location');
      setStepNumber(5);
    } else if (currentStep === 'location') {
      if (!selectedBuilding) {
        toast.error('Please select your location');
        return;
      }
      setCurrentStep('review');
      setStepNumber(6);
    } else if (currentStep === 'review') {
      handleSubmitProfile();
    }
  };

  const handleBack = () => {
    if (currentStep === 'basics') {
      navigate('/');
      return;
    }
    
    if (currentStep === 'photos') {
      setCurrentStep('basics');
      setStepNumber(1);
    } else if (currentStep === 'gender') {
      setCurrentStep('photos');
      setStepNumber(2);
    } else if (currentStep === 'interests') {
      setCurrentStep('gender');
      setStepNumber(3);
    } else if (currentStep === 'location') {
      setCurrentStep('interests');
      setStepNumber(4);
    } else if (currentStep === 'review') {
      setCurrentStep('location');
      setStepNumber(5);
    }
  };
  
  const handleAddPhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Check if we already have 6 photos
    if (photos.length >= MAX_PHOTOS) {
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }
    
    // Check file size (5MB max)
    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      toast.error(`Photo size must be less than ${MAX_PHOTO_SIZE_MB}MB`);
      return;
    }
    
    // Create a URL for the file
    const url = URL.createObjectURL(file);
    
    // Add the new photo
    setPhotos([...photos, {url, file}]);
    
    // Reset the file input so the same file can be selected again
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    const updatedPhotos = [...photos];
    
    // Revoke the URL to prevent memory leaks
    URL.revokeObjectURL(updatedPhotos[index].url);
    
    // Remove the photo
    updatedPhotos.splice(index, 1);
    setPhotos(updatedPhotos);
  };
  
  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      if (selectedInterests.length >= MAX_INTERESTS) {
        toast.error(`You can select up to ${MAX_INTERESTS} interests`);
        return;
      }
      setSelectedInterests([...selectedInterests, interest]);
    }
  };
  
  const toggleClub = (club: string) => {
    if (selectedClubs.includes(club)) {
      setSelectedClubs(selectedClubs.filter(c => c !== club));
    } else {
      if (selectedClubs.length >= MAX_CLUBS) {
        toast.error(`You can select up to ${MAX_CLUBS} clubs`);
        return;
      }
      setSelectedClubs([...selectedClubs, club]);
    }
  };
  
  const addNewInterest = () => {
    if (!newInterest.trim()) return;
    
    // Check if it already exists
    if (availableInterests.includes(newInterest) || selectedInterests.includes(newInterest)) {
      toast.error('This interest already exists');
      return;
    }
    
    // Check max interests
    if (selectedInterests.length >= MAX_INTERESTS) {
      toast.error(`You can select up to ${MAX_INTERESTS} interests`);
      return;
    }
    
    // Add to selected
    setSelectedInterests([...selectedInterests, newInterest]);
    setAvailableInterests([...availableInterests, newInterest]);
    setNewInterest('');
  };
  
  const findNearestBuilding = () => {
    setIsLocating(true);
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsLocating(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        
        // Find nearest building
        let nearestBuilding = buildings[0];
        let minDistance = Number.MAX_VALUE;
        
        buildings.forEach(building => {
          const distance = calculateDistance(
            userLat, userLng, 
            building.latitude, building.longitude
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            nearestBuilding = building;
          }
        });
        
        setSelectedBuilding(nearestBuilding);
        setIsLocating(false);
        toast.success(`Location set to ${nearestBuilding.name}`);
      },
      (error) => {
        console.error('Error getting location:', error);
        setLocationError('Failed to get your location. Please select manually.');
        setIsLocating(false);
        toast.error('Failed to get your location');
      }
    );
  };
  
  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;
    
    const a = 
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance; // Distance in meters
  };
  
  const handleSubmitProfile = async () => {
    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      // Get the selected vibe label
      const vibeLabel = vibeOptions.find(v => v.id === selectedVibe)?.label;
      
      // Create/update user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert({
          auth_id: session.user.id,
          name,
          class_year: classYear,
          role: 'current_student', 
          vibe: vibeLabel,
          gender: gender as UserGender,
          gender_preference: genderPreference,
          bio,
          major,
          building: selectedBuilding?.name,
          location: selectedBuilding?.name,
          latitude: selectedBuilding?.latitude,
          longitude: selectedBuilding?.longitude,
          profile_complete: true
        })
        .select()
        .single();
        
      if (userError) {
        console.error('Error creating user profile:', userError);
        throw userError;
      }
      
      if (!userData) {
        throw new Error('Failed to create user profile');
      }
      
      console.log("session.user.id", session.user.id);
      console.log("userData.id", userData.id);
      
      // Get a fresh copy of the user ID to ensure RLS works properly
      const { data: freshUserData, error: idError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', session.user.id)
        .single();
        
      if (idError || !freshUserData) {
        console.error('Error getting fresh user ID:', idError);
        toast.error('Could not validate user. Please try again.');
        return;
      }
      
      console.log("freshUserData.id", freshUserData.id);
      
      // Import ensureBucketExists from supabase utility
      const { ensureBucketExists } = await import('@/lib/supabase');
      
      // Ensure the bucket exists before trying to upload
      const bucketName = 'user-photos';
      const bucketReady = await ensureBucketExists(bucketName);
      
      if (!bucketReady) {
        toast.error('Unable to prepare storage. Please try again later.');
        return;
      }
      
      // Upload photos using the freshly fetched user ID
      const photoUploadPromises = photos.map(async (photo, i) => {
        try {
          const { file } = photo;
          const fileExt = file.name.split('.').pop();
          const filePath = `${freshUserData.id}/${Date.now()}-${i}.${fileExt}`;
          
          // Upload to storage
          const { error: uploadError, data: uploadData } = await supabase
            .storage
            .from(bucketName)
            .upload(filePath, file, {
              upsert: true,
              cacheControl: '3600'
            });
            
          if (uploadError) {
            console.error('Error uploading photo:', uploadError);
            throw uploadError;
          }
          
          // Get public URL
          const { data: { publicUrl } } = supabase
            .storage
            .from(bucketName)
            .getPublicUrl(filePath);
            
          // Add to photos table using the fresh user ID
          const { error: photoError } = await supabase
            .from('user_photos')
            .insert({
              user_id: freshUserData.id,
              photo_url: publicUrl,
              position: i
            });
            
          if (photoError) {
            console.error('Error creating photo record:', photoError);
            throw photoError;
          }
          
          return { success: true };
        } catch (err) {
          console.error('Error in photo upload process:', err);
          toast.error(`Failed to upload photo ${i+1}`);
          return { success: false };
        }
      });
      
      // Wait for all photo uploads to complete
      const photoResults = await Promise.all(photoUploadPromises);
      const successfulUploads = photoResults.filter(result => result.success).length;
      
      if (successfulUploads < photos.length) {
        toast.warning(`Uploaded ${successfulUploads} of ${photos.length} photos. You can add more later.`);
      }
      
      // Process interests - use freshUserData.id here too
      for (const interest of selectedInterests) {
        // Check if interest exists
        let interestId = null;
        const { data: existingInterest } = await supabase
          .from('interests')
          .select('id')
          .eq('name', interest)
          .maybeSingle();
          
        if (existingInterest) {
          interestId = existingInterest.id;
        } else {
          // Create new interest
          const { data: newInterest, error: newInterestError } = await supabase
            .from('interests')
            .insert({ name: interest })
            .select()
            .single();
            
          if (newInterestError) {
            console.error('Error creating interest:', newInterestError);
            throw newInterestError;
          }
          interestId = newInterest.id;
        }
        
        // Link interest to user with fresh user ID
        const { error: linkError } = await supabase
          .from('user_interests')
          .insert({
            user_id: freshUserData.id,
            interest_id: interestId
          });
          
        if (linkError) {
          console.error('Error linking interest to user:', linkError);
          throw linkError;
        }
      }
      
      // Process clubs - use freshUserData.id here too
      for (const club of selectedClubs) {
        // Check if club exists
        let clubId = null;
        const { data: existingClub } = await supabase
          .from('clubs')
          .select('id')
          .eq('name', club)
          .maybeSingle();
          
        if (existingClub) {
          clubId = existingClub.id;
        } else {
          // Create new club
          const { data: newClub, error: newClubError } = await supabase
            .from('clubs')
            .insert({ name: club })
            .select()
            .single();
            
          if (newClubError) {
            console.error('Error creating club:', newClubError);
            throw newClubError;
          }
          clubId = newClub.id;
        }
        
        // Link club to user with fresh user ID
        const { error: linkError } = await supabase
          .from('user_clubs')
          .insert({
            user_id: freshUserData.id,
            club_id: clubId
          });
          
        if (linkError) {
          console.error('Error linking club to user:', linkError);
          throw linkError;
        }
      }
      
      // Mark profile as complete
      setProfileComplete(true);
      
      toast.success("Profile completed successfully!");
      navigate('/swipe');
      
    } catch (error) {
      console.error('Error completing profile:', error);
      toast.error('Error completing profile. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-black to-[#121212]">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <button 
          onClick={handleBack}
          className="text-princeton-white hover:text-princeton-orange transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <Logo />
        <div className="w-6"></div> {/* Spacer for centering logo */}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h1 className="text-2xl font-bold text-princeton-white">Complete Your Profile</h1>
              <div className="text-princeton-white/60 text-sm">
                Step {stepNumber} of {totalSteps}
              </div>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full tiger-gradient transition-all duration-300"
                style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          <div className="animate-fade-in">
            {currentStep === 'basics' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm text-princeton-white/80">
                    Your Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name displayed to others"
                    required
                    className="w-full p-3 rounded-lg bg-secondary border border-princeton-orange/30 text-princeton-white placeholder:text-princeton-white/50 focus:ring-2 focus:ring-princeton-orange focus:outline-none"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="classYear" className="block text-sm text-princeton-white/80">
                    Class Year
                  </label>
                  <input
                    id="classYear"
                    type="text"
                    value={classYear}
                    onChange={(e) => setClassYear(e.target.value)}
                    placeholder="e.g., 2022"
                    required
                    className="w-full p-3 rounded-lg bg-secondary border border-princeton-orange/30 text-princeton-white placeholder:text-princeton-white/50 focus:ring-2 focus:ring-princeton-orange focus:outline-none"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="major" className="block text-sm text-princeton-white/80">
                    Major
                  </label>
                  <input
                    id="major"
                    type="text"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    placeholder="e.g., Computer Science"
                    required
                    className="w-full p-3 rounded-lg bg-secondary border border-princeton-orange/30 text-princeton-white placeholder:text-princeton-white/50 focus:ring-2 focus:ring-princeton-orange focus:outline-none"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="bio" className="block text-sm text-princeton-white/80">
                    Bio (Optional)
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Share a bit about yourself..."
                    rows={3}
                    className="w-full p-3 rounded-lg bg-secondary border border-princeton-orange/30 text-princeton-white placeholder:text-princeton-white/50 focus:ring-2 focus:ring-princeton-orange focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}
            
            {currentStep === 'photos' && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-princeton-white mb-2">Add Photos</h2>
                  <p className="text-princeton-white/70 text-sm">
                    Show off your best moments (up to 6 photos)
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {/* Hidden file input */}
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  {/* Photo grid */}
                  {[...Array(MAX_PHOTOS)].map((_, index) => {
                    const hasPhoto = index < photos.length;
                    
                    return (
                      <div 
                        key={index}
                        className={`aspect-square rounded-lg overflow-hidden relative flex items-center justify-center ${
                          hasPhoto ? '' : 'border-2 border-dashed border-princeton-orange/30'
                        }`}
                      >
                        {hasPhoto ? (
                          <>
                            <img 
                              src={photos[index].url} 
                              alt={`User photo ${index + 1}`} 
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => handleRemovePhoto(index)}
                              className="absolute top-1 right-1 bg-black/70 rounded-full p-1 text-white hover:bg-black"
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handleAddPhotoClick}
                            disabled={photos.length >= MAX_PHOTOS}
                            className={`w-full h-full flex flex-col items-center justify-center transition-colors ${
                              photos.length >= MAX_PHOTOS 
                                ? 'text-princeton-white/30 cursor-not-allowed' 
                                : 'text-princeton-white/50 hover:text-princeton-orange'
                            }`}
                          >
                            <Upload size={24} />
                            <span className="text-xs mt-1">Add</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <div className="text-center text-xs text-princeton-white/60">
                  First photo will be your main profile picture
                </div>
              </div>
            )}
            
            {currentStep === 'gender' && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-princeton-white mb-2">About You</h2>
                  <p className="text-princeton-white/70 text-sm">
                    Tell us about yourself
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm text-princeton-white/80">
                      Your Gender
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {genderOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setGender(option.value)}
                          className={`p-3 rounded-lg border text-center transition-all duration-200 ${
                            gender === option.value
                              ? 'bg-princeton-orange text-princeton-black border-princeton-orange'
                              : 'bg-secondary text-princeton-white border-princeton-orange/30 hover:border-princeton-orange/60'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm text-princeton-white/80">
                      Show Me
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {preferenceOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setGenderPreference(option.value)}
                          className={`p-3 rounded-lg border text-center transition-all duration-200 ${
                            genderPreference === option.value
                              ? 'bg-princeton-orange text-princeton-black border-princeton-orange'
                              : 'bg-secondary text-princeton-white border-princeton-orange/30 hover:border-princeton-orange/60'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm text-princeton-white/80">
                      Your Vibe
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {vibeOptions.map((vibe) => (
                        <button
                          key={vibe.id}
                          onClick={() => setSelectedVibe(vibe.id)}
                          className={`p-4 rounded-lg border text-left transition-all duration-200 ${
                            selectedVibe === vibe.id
                              ? 'bg-princeton-orange text-princeton-black border-princeton-orange'
                              : 'bg-secondary text-princeton-white border-princeton-orange/30 hover:border-princeton-orange/60'
                          }`}
                        >
                          <div className="text-2xl mb-1">{vibe.emoji}</div>
                          <div className="text-sm font-medium">{vibe.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {currentStep === 'interests' && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-princeton-white mb-2">Interests & Clubs</h2>
                  <p className="text-princeton-white/70 text-sm">
                    Select up to {MAX_INTERESTS} interests and {MAX_CLUBS} clubs
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm text-princeton-white/80 flex justify-between">
                      <span>Interests</span>
                      <span className="text-princeton-orange">{selectedInterests.length}/{MAX_INTERESTS}</span>
                    </label>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedInterests.map((interest) => (
                        <button
                          key={interest}
                          onClick={() => toggleInterest(interest)}
                          className="px-3 py-1 bg-princeton-orange text-black rounded-full text-sm flex items-center gap-1"
                        >
                          {interest}
                          <X size={14} />
                        </button>
                      ))}
                    </div>
                    
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newInterest}
                        onChange={(e) => setNewInterest(e.target.value)}
                        placeholder="Add new interest..."
                        className="flex-1 p-2 rounded-lg bg-secondary border border-princeton-orange/30 text-princeton-white placeholder:text-princeton-white/50 focus:ring-2 focus:ring-princeton-orange focus:outline-none text-sm"
                      />
                      <button
                        onClick={addNewInterest}
                        disabled={!newInterest.trim() || selectedInterests.length >= MAX_INTERESTS}
                        className="px-3 py-1 bg-princeton-orange text-black rounded-lg text-sm disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                    
                    <div className="max-h-40 overflow-y-auto bg-secondary/50 rounded-lg p-2">
                      <div className="flex flex-wrap gap-2">
                        {availableInterests
                          .filter(interest => !selectedInterests.includes(interest))
                          .map((interest) => (
                            <button
                              key={interest}
                              onClick={() => toggleInterest(interest)}
                              disabled={selectedInterests.length >= MAX_INTERESTS}
                              className="px-3 py-1 bg-secondary text-princeton-white/80 rounded-full text-sm hover:bg-secondary/80 disabled:opacity-50"
                            >
                              {interest}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm text-princeton-white/80 flex justify-between">
                      <span>Princeton Clubs</span>
                      <span className="text-princeton-orange">{selectedClubs.length}/{MAX_CLUBS}</span>
                    </label>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedClubs.map((club) => (
                        <button
                          key={club}
                          onClick={() => toggleClub(club)}
                          className="px-3 py-1 bg-princeton-orange text-black rounded-full text-sm flex items-center gap-1"
                        >
                          {club}
                          <X size={14} />
                        </button>
                      ))}
                    </div>
                    
                    <div className="max-h-4


import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heart, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getPotentialMatches, recordSwipe } from '@/lib/api';
import { UserWithRelations } from '@/types/database';
import ProfileCompletionNotification from './ProfileCompletionNotification';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

// Define a proper type for PotentialMatch that satisfies UserWithRelations
interface PotentialMatch {
  auth_id: string;
  id: string;
  name: string;
  class_year?: string; // Make class_year optional to match UserWithRelations
  bio?: string;
  major?: string;
  photo_urls?: string[];
  gender?: string;
  gender_preference?: string;
  profile_complete?: boolean; // Make profile_complete optional to match UserWithRelations
  intention?: 'casual' | 'serious';
  interests: { name: { name: string } }[];
  // Adding missing properties to match UserWithRelations
  clubs: { name: { name: string } }[];
  role?: string;
  created_at?: string;
  updated_at?: string;
}

interface SwipeCardProps {
  user: PotentialMatch;
  onSwipe: (direction: 'left' | 'right') => void;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ user, onSwipe }) => {
  const navigate = useNavigate();
  const [exitX, setExitX] = useState<number | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Card dragging functionality
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-20, 0, 20]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  const scale = useTransform(x, [-200, -150, 0, 150, 200], [0.8, 0.9, 1, 0.9, 0.8]);
  const rightIndicatorOpacity = useTransform(x, [0, 50, 100], [0, 0.5, 1]);
  const leftIndicatorOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  
  // Record the swipe in the database and check if it's a match
  const swipeMutation = useMutation({
    mutationFn: ({ userId, direction }: { userId: string, direction: 'left' | 'right' }) => 
      recordSwipe(userId, direction),
    onSuccess: (data) => {
      if (data === true) {
        toast.success("It's a match! 🎉", {
          action: {
            label: "View Matches",
            onClick: () => navigate('/matches')
          }
        });
      }
    },
    onError: () => {
      toast.error("Error recording swipe");
    }
  });

  const handleDrag = (event: any, info: any) => {
    if (info.offset.x > 100) {
      setExitX(200);
      onSwipe('right');
      swipeMutation.mutate({ userId: user.auth_id, direction: 'right' });
    } else if (info.offset.x < -100) {
      setExitX(-200);
      onSwipe('left');
      swipeMutation.mutate({ userId: user.auth_id, direction: 'left' });
    }
  };
  
  // Add ability to view profile when clicking on card
  const viewProfile = () => {
    navigate(`/profile/${user.auth_id}`);
  };

  // Calculate the total number of images
  const totalImages = user.photo_urls?.length || 0;

  // Render interests properly
  const renderInterests = () => {
    if (!user.interests || user.interests.length === 0) return null;
    
    // Handle different potential interest formats based on our updated type
    const interestsToDisplay = user.interests.map((interest: any) => {
      if (typeof interest === 'string') return interest;
      if (interest?.name?.name) return interest.name.name;
      if (interest?.name) return interest.name;
      return '';
    }).filter(Boolean).slice(0, 3);

    const remainingCount = user.interests.length - interestsToDisplay.length;
    
    return (
      <div className="flex flex-wrap gap-1 mb-2">
        {interestsToDisplay.map((interest: string, index: number) => (
          <span key={index} className="px-2 py-0.5 bg-white/30 rounded-full text-xs text-white">
            {interest}
          </span>
        ))}
        
        {remainingCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs text-white">
            +{remainingCount} more
          </span>
        )}
      </div>
    );
  };

  // Render relationship intention (removed the emojis and specific text)
  const renderIntention = () => {
    const intention = user.intention;
    if (!intention) return null;
    
    return (
      <div className="flex items-center text-xs text-princeton-orange font-medium mb-2">
        <span>{intention === 'casual' ? 'Casual' : 'Serious'}</span>
      </div>
    );
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDrag}
      style={{ x, rotate, opacity, scale }}
      exit={{ x: exitX || 0 }}
      transition={{ duration: 0.2 }}
      className="absolute w-full h-full bg-secondary rounded-xl overflow-hidden"
    >
      <div className="relative h-full">
        {/* Profile Image Carousel */}
        <div className="h-[70%] w-full relative">
          {user.photo_urls && user.photo_urls.length > 0 ? (
            <>
              <img
                src={user.photo_urls[currentImageIndex]}
                alt={`${user.name}'s photo`}
                className="w-full h-full object-cover"
                loading="lazy" // Add lazy loading for better performance
              />
              
              {/* Image Navigation */}
              {totalImages > 1 && (
                <>
                  {/* Image Indicators */}
                  <div className="absolute top-2 left-0 right-0 flex justify-center gap-1">
                    {user.photo_urls.map((_, index) => (
                      <div 
                        key={index} 
                        className={`h-1 rounded-full ${
                          index === currentImageIndex 
                            ? "w-6 bg-princeton-orange" 
                            : "w-2 bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                  
                  {/* Previous Image Button */}
                  {currentImageIndex > 0 && (
                    <button 
                      className="absolute top-1/2 left-2 -translate-y-1/2 bg-black/30 p-1 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(prev => prev - 1);
                      }}
                    >
                      <ChevronLeft className="text-white" size={20} />
                    </button>
                  )}
                  
                  {/* Next Image Button */}
                  {currentImageIndex < totalImages - 1 && (
                    <button 
                      className="absolute top-1/2 right-2 -translate-y-1/2 bg-black/30 p-1 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(prev => prev + 1);
                      }}
                    >
                      <ChevronRight className="text-white" size={20} />
                    </button>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-500">No photo available</span>
            </div>
          )}
        </div>
        
        {/* Swipe Indicators */}
        <motion.div 
          className="absolute top-4 right-4 bg-green-500 p-2 rounded-full"
          style={{ opacity: rightIndicatorOpacity }}
        >
          <Heart size={32} className="text-white" />
        </motion.div>
      
        <motion.div 
          className="absolute top-4 left-4 bg-red-500 p-2 rounded-full"
          style={{ opacity: leftIndicatorOpacity }}
        >
          <X size={32} className="text-white" />
        </motion.div>
        
        {/* Profile Info */}
        <div 
          className="absolute bottom-0 w-full p-4"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0))" }}
          onClick={viewProfile}
        >
          <h2 className="text-2xl font-bold text-white mb-0">{user.name}, {user.class_year}</h2>
          {user.major && <p className="text-princeton-orange mb-1">{user.major}</p>}
          
          {renderIntention()}
          
          {user.bio && <p className="text-white/80 line-clamp-3 mb-2">{user.bio}</p>}
          
          {renderInterests()}
          
          <Button 
            variant="ghost" 
            className="px-2 py-1 text-xs text-white/90 hover:text-white"
            onClick={viewProfile}
          >
            View Full Profile
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

const NoMoreUsers = () => (
  <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-secondary rounded-xl text-center">
    <div className="mb-4 text-6xl">👀</div>
    <h2 className="text-2xl font-bold text-princeton-white mb-2">No more Tigers nearby</h2>
    <p className="text-princeton-white/70 mb-6">Check back later for new matches</p>
    <Button 
      variant="outline"
      className="border-princeton-orange text-princeton-orange hover:bg-princeton-orange/10"
      onClick={() => window.location.reload()}
    >
      Refresh
    </Button>
  </div>
);

const LoadingMatchesCard = () => (
  <div className="h-full w-full flex flex-col bg-secondary rounded-xl overflow-hidden">
    <Skeleton className="h-[70%] w-full bg-gray-300" />
    <div className="p-4">
      <Skeleton className="h-6 w-3/4 mb-2 bg-gray-300" />
      <Skeleton className="h-4 w-1/2 mb-4 bg-gray-300" />
      <Skeleton className="h-3 w-full mb-2 bg-gray-300" />
      <Skeleton className="h-3 w-full mb-2 bg-gray-300" />
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-4 w-16 rounded-full bg-gray-300" />
        <Skeleton className="h-4 w-16 rounded-full bg-gray-300" />
      </div>
    </div>
  </div>
);

const SwipePage: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch potential matches with a staleTime to avoid refetching too often
  const { data: potentialMatches, isLoading, isError } = useQuery({
    queryKey: ['potential-matches'],
    queryFn: getPotentialMatches,
    staleTime: 30000, // Data will be fresh for 30 seconds
    meta: {
      onError: (error: Error) => {
        console.error("Error fetching potential matches:", error);
        toast.error("Failed to load matches");
      }
    }
  });

  const handleSwipe = () => {
    setCurrentIndex(prevIndex => prevIndex + 1);
  };

  // Handle button swipe
  const handleButtonSwipe = async (direction: 'left' | 'right') => {
    if (!potentialMatches || currentIndex >= potentialMatches.length) return;
    
    const user = potentialMatches[currentIndex];
    
    try {
      const isMatch = await recordSwipe(user.auth_id, direction);
      if (isMatch) {
        toast.success("It's a match! 🎉", {
          action: {
            label: "View Matches",
            onClick: () => navigate('/matches')
          }
        });
      }
      setCurrentIndex(prevIndex => prevIndex + 1);
    } catch (error) {
      console.error("Error recording swipe:", error);
      toast.error("Error recording swipe");
    }
  };

  // Navigate to admirers page
  const navigateToAdmirers = () => {
    navigate('/likers');
  };

  // Show empty state for loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-[#121212] p-4">
        <div className="container mx-auto max-w-md h-full flex flex-col">
          <div className="mb-6">
            <ProfileCompletionNotification />
          </div>
          <div className="flex justify-end mb-4">
            <Button 
              variant="outline" 
              className="border-princeton-orange text-princeton-orange hover:bg-princeton-orange/10"
              disabled
            >
              My Admirers
            </Button>
          </div>
          <div className="flex-1 relative">
            <LoadingMatchesCard />
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-[#121212] p-4">
        <div className="container mx-auto max-w-md h-full flex flex-col">
          <div className="mb-6">
            <ProfileCompletionNotification />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-princeton-white bg-red-500/10 p-4 rounded-lg">
              <p>Error loading matches</p>
              <Button 
                className="mt-4" 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['potential-matches'] })}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const noMoreUsers = !potentialMatches || potentialMatches.length === 0 || currentIndex >= potentialMatches.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-[#121212] p-4 flex flex-col">
      <div className="container mx-auto max-w-md flex-1 flex flex-col">
        <div className="mb-6">
          <ProfileCompletionNotification />
        </div>
        
        {/* Admirers Button */}
        <div className="flex justify-end mb-4">
          <Button 
            variant="outline" 
            className="border-princeton-orange text-princeton-orange hover:bg-princeton-orange/10"
            onClick={navigateToAdmirers}
          >
            My Admirers
          </Button>
        </div>
        
        <div className="flex-1 relative">
          {!noMoreUsers ? (
            <SwipeCard
              user={potentialMatches[currentIndex]}
              onSwipe={handleSwipe}
            />
          ) : (
            <NoMoreUsers />
          )}
        </div>
        
        {/* Action buttons positioned at the bottom of the screen */}
        <div className="flex justify-center gap-6 mt-auto py-8">
          <Button
            variant="outline"
            size="icon"
            className="w-16 h-16 rounded-full border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
            onClick={() => handleButtonSwipe('left')}
            disabled={noMoreUsers}
          >
            <X size={32} />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className="w-16 h-16 rounded-full border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white transition-colors"
            onClick={() => handleButtonSwipe('right')}
            disabled={noMoreUsers}
          >
            <Heart size={32} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SwipePage;

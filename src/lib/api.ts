import { supabase } from './supabase';
import { UserGender, GenderPreference, UserWithRelations } from '@/types/database';

/**
 * Gets the current authenticated user
 */
export const getCurrentUser = async (): Promise<UserWithRelations | null> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData?.session?.user) {
      console.log("getCurrentUser: No authenticated user");
      return null;
    }
    
    const userId = sessionData.session.user.id;
    console.log("getCurrentUser: Looking up user with auth_id:", userId);
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        interests:user_interests(name:interests(*)),
        clubs:user_clubs(name:clubs(*))
      `)
      .eq('auth_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error getting current user:', error);
      
      // If the error is that no rows were returned, return null instead of throwing
      if (error.code === 'PGRST116') {
        return null;
      }
      
      throw error;
    }
    
    return data as UserWithRelations;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Gets a user by ID
 */
export const getUserById = async (userId: string): Promise<UserWithRelations | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        interests:user_interests(name:interests(*)),
        clubs:user_clubs(name:clubs(*))
      `)
      .eq('auth_id', userId)
      .single();
    
    if (error) throw error;
    
    return data as UserWithRelations;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
};

/**
 * Updates the logged in user's profile
 */
export const updateUserProfile = async (
  profileData: {
    name?: string;
    bio?: string;
    major?: string;
    gender?: UserGender;
    gender_preference?: GenderPreference;
    building?: string;
    vibe?: string;
    intention?: 'casual' | 'serious';
    photo_urls?: string[];
    class_year?: string;
  }
) => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) throw new Error("No authenticated user");
    
    const userId = sessionData.session.user.id;
    console.log("updateUserProfile: Updating profile for auth_id:", userId);
    
    // First update the basic profile fields
    const { error } = await supabase
      .from('users')
      .update({
        ...profileData,
        updated_at: new Date().toISOString(),
        profile_complete: true
      })
      .eq('auth_id', userId);
    
    if (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Updates a user's interests
 */
export const updateUserInterests = async (interests: string[]) => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("No authenticated user");
    
    const userId = userData.user.id;
    
    // First delete all existing interests for the user
    const { error: deleteError } = await supabase
      .from('user_interests')
      .delete()
      .eq('user_id', userId);
    
    if (deleteError) throw deleteError;
    
    // Insert new interests
    if (interests.length > 0) {
      const interestRows = interests.map(interestId => ({
        user_id: userId,
        interest_id: interestId
      }));
      
      const { error: insertError } = await supabase
        .from('user_interests')
        .insert(interestRows);
      
      if (insertError) throw insertError;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user interests:', error);
    throw error;
  }
};

/**
 * Updates a user's clubs
 */
export const updateUserClubs = async (clubs: string[]) => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("No authenticated user");
    
    const userId = userData.user.id;
    
    // First delete all existing clubs for the user
    const { error: deleteError } = await supabase
      .from('user_clubs')
      .delete()
      .eq('user_id', userId);
    
    if (deleteError) throw deleteError;
    
    // Insert new clubs
    if (clubs.length > 0) {
      const clubRows = clubs.map(clubId => ({
        user_id: userId,
        club_id: clubId
      }));
      
      const { error: insertError } = await supabase
        .from('user_clubs')
        .insert(clubRows);
      
      if (insertError) throw insertError;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user clubs:', error);
    throw error;
  }
};

/**
 * Uploads a user photo to Supabase Storage
 */
export const uploadUserPhoto = async (file: File, position: number = 0): Promise<string> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("No authenticated user");
    
    const userId = userData.user.id;
    
    // Ensure the bucket exists
    const bucketName = 'user-photos';
    
    // Create a unique file name using the current timestamp
    const fileName = `${userId}-${Date.now()}.${file.name.split('.').pop()}`;
    
    // Upload the file
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .upload(`${userId}/${fileName}`, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) throw error;
    
    // Get the public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from(bucketName)
      .getPublicUrl(`${userId}/${fileName}`);
    
    // Update the user's photo_urls array
    const { data: user } = await supabase
      .from('users')
      .select('photo_urls')
      .eq('auth_id', userId)
      .single();
    
    let photoUrls = user?.photo_urls || [];
    
    // Insert at the specified position
    if (Array.isArray(photoUrls)) {
      photoUrls.splice(position, 0, publicUrl);
    } else {
      photoUrls = [publicUrl];
    }
    
    await supabase
      .from('users')
      .update({ photo_urls: photoUrls })
      .eq('auth_id', userId);
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading user photo:', error);
    throw error;
  }
};

/**
 * Deletes a user photo
 */
export const deleteUserPhoto = async (photoUrl: string): Promise<void> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("No authenticated user");
    
    const userId = userData.user.id;
    
    // Get the current photo_urls array
    const { data: user } = await supabase
      .from('users')
      .select('photo_urls')
      .eq('auth_id', userId)
      .single();
    
    if (!user?.photo_urls) return;
    
    // Remove the URL from the array
    const updatedPhotoUrls = user.photo_urls.filter(url => url !== photoUrl);
    
    // Update the user record
    await supabase
      .from('users')
      .update({ photo_urls: updatedPhotoUrls })
      .eq('auth_id', userId);
    
    // Extract the file name from the URL to delete from storage
    const fileName = photoUrl.split('/').pop();
    if (fileName) {
      await supabase
        .storage
        .from('user-photos')
        .remove([`${userId}/${fileName}`]);
    }
  } catch (error) {
    console.error('Error deleting user photo:', error);
    throw error;
  }
};

/**
 * Records a user's swipe (like or pass)
 */
export const recordSwipe = async (
  swipedUserId: string, 
  direction: 'left' | 'right'
): Promise<boolean> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("No authenticated user");
    
    const userId = userData.user.id;
    const liked = direction === 'right';
    
    console.log(`Recording swipe: ${userId} swiped ${direction} on ${swipedUserId}`);
    
    // Get the database IDs from auth_ids
    const { data: swiperData, error: swiperError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', userId)
      .single();
    
    if (swiperError || !swiperData) {
      console.error('Error getting swiper ID:', swiperError || 'User not found');
      return false;
    }
    
    const { data: swipedData, error: swipedError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', swipedUserId)
      .single();
    
    if (swipedError || !swipedData) {
      console.error('Error getting swiped ID:', swipedError || 'User not found');
      return false;
    }
    
    const swiperId = swiperData.id;
    const swipedId = swipedData.id;
    
    if (!swiperId || !swipedId) {
      console.error('Missing user IDs for swipe operation');
      return false;
    }
    
    // Record the swipe - using the correct column names from schema
    const { error } = await supabase
      .from('swipes')
      .insert({
        swiper_id: swiperId,
        swiped_id: swipedId,
        direction: liked ? 'right' : 'left'
      });
    
    if (error) {
      console.error('Error inserting swipe:', error);
      return false;
    }
    
    // If liked, check if there's a mutual like (a match)
    if (liked) {
      console.log("Checking for mutual like...");
      const { data, error: matchError } = await supabase
        .from('swipes')
        .select('*')
        .eq('swiper_id', swipedId)
        .eq('swiped_id', swiperId)
        .eq('direction', 'right')
        .single();
      
      if (matchError) {
        if (matchError.code !== 'PGRST116') { // Not found error is expected if no match
          console.error('Error checking for match:', matchError);
        }
        return false;
      }
      
      if (data) {
        console.log('Found a match!', data);
        // It's a match! Create a new match record
        
        // Ensure we follow the constraint where user_id_1 < user_id_2
        const { error: matchRecordError } = await supabase
          .from('matches')
          .insert({
            user_id_1: swiperId < swipedId ? swiperId : swipedId,
            user_id_2: swiperId < swipedId ? swipedId : swiperId
          });
        
        if (matchRecordError) {
          console.error('Error creating match record:', matchRecordError);
          return false;
        }
        
        return true; // Return true to indicate it's a match
      }
    }
    
    return false; // No match
  } catch (error) {
    console.error('Error recording swipe:', error);
    return false;
  }
};

/**
 * Gets potential matches for the user to swipe on
 */
export const getPotentialMatches = async (): Promise<UserWithRelations[]> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];
    
    const userId = userData.user.id;
    const limit = 20;
    
    // First get the user's database ID from auth_id
    const { data: currentUserData, error: userIdError } = await supabase
      .from('users')
      .select('id, gender_preference, gender')
      .eq('auth_id', userId)
      .maybeSingle(); // Use maybeSingle instead of single
    
    if (userIdError || !currentUserData) {
      console.error("Error getting user database ID:", userIdError || "User not found");
      return [];
    }
    
    const dbUserId = currentUserData.id;
    
    // Get the user's gender preference
    const currentUser = currentUserData;
    
    // Build query based on gender preference
    let query = supabase
      .from('users')
      .select(`
        *,
        interests:user_interests(name:interests(*)),
        clubs:user_clubs(name:clubs(*))
      `)
      .neq('auth_id', userId) // Don't include the current user
      .eq('profile_complete', true) // Only include users with complete profiles
      .order('created_at', { ascending: false }) // Get newest profiles first
      .limit(limit);
    
    // Filter based on the user's gender preference
    if (currentUser.gender_preference !== 'everyone') {
      query = query.eq('gender', currentUser.gender_preference);
    }
    
    // Get users who haven't been swiped on yet
    const { data: swipedUserIds, error: swipeError } = await supabase
      .from('swipes')
      .select('swiped_id')
      .eq('swiper_id', dbUserId);
    
    if (swipeError) {
      console.error("Error getting swiped users:", swipeError);
      // Continue without this filter if there's an error
    }
    else if (swipedUserIds && swipedUserIds.length > 0) {
      // If there are swiped users, exclude them from results
      const ids = swipedUserIds.map(s => s.swiped_id);
      query = query.not('id', 'in', `(${ids.join(',')})`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error getting potential matches:", error);
      return [];
    }
    
    return data as UserWithRelations[] || [];
  } catch (error) {
    console.error('Error getting potential matches:', error);
    return [];
  }
};

/**
 * Gets users who have liked the current user but haven't been swiped on yet
 */
export const getUserLikers = async (): Promise<UserWithRelations[]> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];
    
    const userId = userData.user.id;
    
    // Get the user's database ID from auth_id
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', userId)
      .single();
    
    if (userError || !currentUser) {
      console.error("Error getting user ID:", userError);
      return [];
    }

    console.log("Fetching admirers for user ID:", currentUser.id);
    
    // Use a direct SQL query to get admirers
    // This fetches users who have swiped right on current user but current user hasn't swiped on them
    const { data: admirers, error: admirersError } = await supabase.rpc('get_user_admirers', {
      current_user_id: currentUser.id
    });
    
    if (admirersError) {
      console.error("Error getting admirers:", admirersError);
      return [];
    }
    
    console.log(`Found ${admirers?.length || 0} admirers`);
    return admirers as UserWithRelations[] || [];
  } catch (error) {
    console.error('Error getting user admirers:', error);
    return [];
  }
};

/**
 * Gets a user's matches
 */
export const getUserMatches = async (): Promise<any[]> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];
    
    const userId = userData.user.id;
    
    // First get the user's database ID from auth_id
    const { data: userInfo, error: userIdError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', userId)
      .maybeSingle(); // Use maybeSingle instead of single
    
    if (userIdError || !userInfo) {
      console.error("Error getting user database ID:", userIdError || "User not found");
      return [];
    }
    
    const dbUserId = userInfo.id;
    
    // Get matches where the user is either user_id_1 or user_id_2
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        user1:user_id_1(id, auth_id, name, photo_urls),
        user2:user_id_2(id, auth_id, name, photo_urls)
      `)
      .or(`user_id_1.eq.${dbUserId},user_id_2.eq.${dbUserId}`);
    
    if (error) {
      console.error("Error getting matches:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Transform the data to get the matched user
    const matches = data.map(match => {
      // Determine which user in the match is the matched user (the other person)
      const matchedUser = match.user1.id === dbUserId ? match.user2 : match.user1;
      
      // Check for unread messages
      let unread = false;
      let lastMessage = null;
      let lastMessageTime = match.updated_at || match.created_at;
      
      return {
        matchId: match.id,
        userId: matchedUser.auth_id,
        name: matchedUser.name,
        photoUrl: matchedUser.photo_urls ? matchedUser.photo_urls[0] : null,
        lastActivity: lastMessageTime,
        unread: unread,
        lastMessage: lastMessage,
        lastMessageTime: new Date(lastMessageTime).toLocaleDateString()
      };
    });
    
    return matches;
  } catch (error) {
    console.error('Error getting user matches:', error);
    return [];
  }
};

/**
 * Gets messages for a specific match
 */
export const getMessages = async (matchId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
};

/**
 * Sends a message in a match's conversation
 */
export const sendMessage = async (
  matchId: string, 
  content: string
): Promise<any> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("No authenticated user");
    
    const senderId = userData.user.id;
    
    // Insert the message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        match_id: matchId,
        sender_id: senderId,
        message: content, // Changed from content to message to match schema
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Update the match's updated_at timestamp
    const { error: updateError } = await supabase
      .from('matches')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', matchId);
    
    if (updateError) throw updateError;
    
    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Marks all messages in a match as read
 */
export const markMessagesAsRead = async (matchId: string): Promise<void> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("No authenticated user");
    
    const userId = userData.user.id;
    
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('match_id', matchId)
      .neq('sender_id', userId)
      .eq('read', false);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

/**
 * Gets hot zones (popular locations)
 */
export const getHotZones = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('hot_zones')
      .select('*')
      .order('active_users', { ascending: false });
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error getting hot zones:', error);
    return [];
  }
};

/**
 * Updates user settings
 */
export const updateUserSettings = async (
  settings: {
    notifications?: boolean;
    messageNotifications?: boolean;
    locationEnabled?: boolean;
    showActive?: boolean;
    darkMode?: boolean;
    [key: string]: any;
  }
): Promise<void> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("No authenticated user");
    
    const userId = userData.user.id;
    
    // First get the current settings
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('settings')
      .eq('auth_id', userId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Merge with existing settings
    const currentSettings = user?.settings || {};
    const updatedSettings = { ...currentSettings, ...settings };
    
    // Update the settings in the database
    const { error } = await supabase
      .from('users')
      .update({ settings: updatedSettings })
      .eq('auth_id', userId);
    
    if (error) throw error;
    
    return;
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
};

/**
 * Delete user account
 */
export const deleteAccount = async (): Promise<void> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("No authenticated user");
    
    const userId = userData.user.id;
    
    // First delete user data from the users table
    const { error: deleteUserError } = await supabase
      .from('users')
      .delete()
      .eq('auth_id', userId);
    
    if (deleteUserError) throw deleteUserError;
    
    // Then delete the auth user
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
      userId
    );
    
    if (deleteAuthError) throw deleteAuthError;
    
    return;
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
};

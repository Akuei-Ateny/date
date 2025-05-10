
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserProfile from '@/pages/UserProfile';
import { getCurrentUser } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // If no ID is provided, we'll use the current user's ID
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: !id, // Only fetch if no ID is provided
  });
  
  // If id is not provided, use the current user's ID from the API response
  const viewUserId = id || (currentUser ? currentUser.auth_id : undefined);
  
  // Redirect to login if not authenticated
  if (!isLoading && !currentUser && !id) {
    navigate('/');
    return null;
  }
  
  // Only render UserProfile if we have a user ID (either from URL or current user)
  return viewUserId ? <UserProfile viewUserId={viewUserId} /> : null;
};

export default Profile;

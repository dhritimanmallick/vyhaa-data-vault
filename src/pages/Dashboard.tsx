import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Files, Users, Activity, Settings, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DocumentData {
  id: string;
  name: string;
  description: string | null;
  file_size: number | null;
  mime_type: string | null;
  category: string | null;
  subcategory: string | null;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  totalDocuments: number;
  activeUsers: number;
  recentActivity: number;
}

export default function Dashboard() {
  const { profile, isAdmin, user } = useAuth();
  const { toast } = useToast();
  const [userDocuments, setUserDocuments] = useState<DocumentData[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    activeUsers: 0,
    recentActivity: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      if (isAdmin) {
        fetchAdminStats();
      } else {
        fetchUserDocuments();
      }
    }
  }, [user, isAdmin]);

  const fetchUserDocuments = async () => {
    try {
      setLoading(true);
      
      // Fetch documents that the user has access to via document_access table
      const { data: documentAccess, error: accessError } = await supabase
        .from('document_access')
        .select(`
          document_id,
          documents (
            id,
            name,
            description,
            file_size,
            mime_type,
            category,
            subcategory,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user?.id);

      if (accessError) {
        console.error('Error fetching user documents:', accessError);
        toast({
          title: "Error",
          description: "Failed to fetch your documents",
          variant: "destructive",
        });
        return;
      }

      // Extract documents from the join result
      const documents = documentAccess
        ?.map(access => access.documents)
        .filter(doc => doc !== null) as DocumentData[] || [];
      
      setUserDocuments(documents);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      
      // Fetch total documents count
      const { count: documentsCount, error: docsError } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true });

      // Fetch active users count
      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: activityCount, error: activityError } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      if (docsError || usersError || activityError) {
        console.error('Error fetching stats:', docsError || usersError || activityError);
        toast({
          title: "Error",
          description: "Failed to fetch dashboard statistics",
          variant: "destructive",
        });
        return;
      }

      setStats({
        totalDocuments: documentsCount || 0,
        activeUsers: usersCount || 0,
        recentActivity: activityCount || 0,
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownload = async (doc: DocumentData) => {
    try {
      // Create signed URL for download
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.id, 3600); // 1 hour expiry

      if (urlError) {
        console.error('Error creating signed URL:', urlError);
        toast({
          title: "Download Error",
          description: "Failed to create download link",
          variant: "destructive",
        });
        return;
      }

      // Create download link and trigger download
      const link = window.document.createElement('a');
      link.href = signedUrlData.signedUrl;
      link.download = doc.name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);

      // Log the download
      await supabase
        .from('audit_logs')
        .insert({
          action: 'download',
          document_id: doc.id,
          user_id: user?.id,
          ip_address: 'unknown',
          user_agent: navigator.userAgent,
        });

      toast({
        title: "Download Started",
        description: `${doc.name} is being downloaded`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error",
        description: "Failed to download the file",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome, {profile?.full_name}</h1>
        <p className="text-muted-foreground">
          {isAdmin ? 'Admin Dashboard' : 'Document Access Portal'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isAdmin && (
          <>
             <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                 <Files className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold">{stats.totalDocuments}</div>
                 <p className="text-xs text-muted-foreground">
                   {stats.totalDocuments === 0 ? 'No documents uploaded yet' : 'Documents in the system'}
                 </p>
               </CardContent>
             </Card>

             <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                 <Users className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold">{stats.activeUsers}</div>
                 <p className="text-xs text-muted-foreground">
                   {stats.activeUsers === 1 ? 'Active user' : 'Active users'}
                 </p>
               </CardContent>
             </Card>

             <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                 <Activity className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold">{stats.recentActivity}</div>
                 <p className="text-xs text-muted-foreground">
                   {stats.recentActivity === 0 ? 'No recent activity' : 'Actions in the last 7 days'}
                 </p>
               </CardContent>
             </Card>
          </>
        )}

        {!isAdmin && (
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>Your Documents</CardTitle>
              <CardDescription>
                Documents that have been shared with you
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userDocuments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No documents have been assigned to you yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {userDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">{doc.name}</h3>
                        {doc.description && (
                          <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {doc.category && <span>Category: {doc.category}</span>}
                          {doc.file_size && <span>Size: {formatFileSize(doc.file_size)}</span>}
                          <span>Added: {new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        className="ml-4"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {isAdmin && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button className="h-20 flex flex-col items-center justify-center">
              <Files className="h-6 w-6 mb-2" />
              Upload Document
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center"
              onClick={() => window.location.href = '/users'}
            >
              <Users className="h-6 w-6 mb-2" />
              Manage Users
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Activity className="h-6 w-6 mb-2" />
              View Audit Logs
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Settings className="h-6 w-6 mb-2" />
              Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
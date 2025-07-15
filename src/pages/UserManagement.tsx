import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Plus, Trash2, UserCheck, UserX, FileText, Share } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
}

interface Document {
  id: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  created_at: string;
}

export default function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [userDocumentAccess, setUserDocumentAccess] = useState<Record<string, string[]>>({});
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, name, category, subcategory, created_at')
        .order('category', { ascending: true });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch documents",
        variant: "destructive",
      });
    }
  };

  const fetchUserDocumentAccess = async () => {
    try {
      const { data, error } = await supabase
        .from('document_access')
        .select('user_id, document_id');

      if (error) throw error;
      
      // Group by user_id
      const accessMap: Record<string, string[]> = {};
      data?.forEach(access => {
        if (!accessMap[access.user_id]) {
          accessMap[access.user_id] = [];
        }
        accessMap[access.user_id].push(access.document_id);
      });
      
      setUserDocumentAccess(accessMap);
    } catch (error: any) {
      console.error('Error fetching document access:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchUsers(), fetchDocuments(), fetchUserDocumentAccess()]);
    };
    loadData();
  }, []);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;

    setIsCreating(true);
    
    try {
      // Call the edge function to create user and send email
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserEmail,
          full_name: newUserName,
        },
      });

      if (error) throw error;

      toast({
        title: "User created successfully!",
        description: `Welcome email sent to ${newUserEmail}`,
      });

      setNewUserEmail('');
      setNewUserName('');
      setIsDialogOpen(false);
      fetchUsers(); // Refresh user list
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });

      fetchUsers(); // Refresh user list
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const openAccessDialog = (user: Profile) => {
    setSelectedUser(user);
    setSelectedDocuments(userDocumentAccess[user.user_id] || []);
    setIsAccessDialogOpen(true);
  };

  const saveDocumentAccess = async () => {
    if (!selectedUser) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // First, remove all existing access for this user
      await supabase
        .from('document_access')
        .delete()
        .eq('user_id', selectedUser.user_id);

      // Then add the new access permissions
      if (selectedDocuments.length > 0) {
        const accessRecords = selectedDocuments.map(documentId => ({
          user_id: selectedUser.user_id,
          document_id: documentId,
          granted_by: user.id
        }));

        const { error } = await supabase
          .from('document_access')
          .insert(accessRecords);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Document access updated successfully",
      });

      setIsAccessDialogOpen(false);
      fetchUserDocumentAccess(); // Refresh access data
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update document access",
        variant: "destructive",
      });
    }
  };

  const formatDocumentName = (document: Document) => {
    const category = document.category?.replace(/^\d+_/, '').replace(/_/g, ' ') || 'Uncategorized';
    const subcategory = document.subcategory?.replace(/^\d+_/, '').replace(/_/g, ' ');
    return subcategory ? `${category} > ${subcategory}` : category;
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage users and their access permissions</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system. They will receive login credentials via email.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  required
                />
              </div>
              <Alert>
                <AlertDescription>
                  The user will receive an email with login credentials. Default password: <strong>Welcome@123</strong>
                </AlertDescription>
              </Alert>
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </div>
                  ) : (
                    'Create User'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            All Users ({users.length})
          </CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Document Access</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                     <TableCell>
                       {user.role === 'admin' ? (
                         <Badge variant="default">All Documents</Badge>
                       ) : (
                         <Badge variant="outline">
                           {userDocumentAccess[user.user_id]?.length || 0} documents
                         </Badge>
                       )}
                     </TableCell>
                     <TableCell>
                       <Badge variant={user.is_active ? 'default' : 'destructive'}>
                         {user.is_active ? 'Active' : 'Inactive'}
                       </Badge>
                     </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {user.role !== 'admin' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAccessDialog(user)}
                            >
                              <Share className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleUserStatus(user.user_id, user.is_active)}
                            >
                              {user.is_active ? (
                                <UserX className="h-4 w-4" />
                              ) : (
                                <UserCheck className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Document Access Dialog */}
      <Dialog open={isAccessDialogOpen} onOpenChange={setIsAccessDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Document Access</DialogTitle>
            <DialogDescription>
              Select which documents {selectedUser?.full_name} can access
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Select Documents</Label>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDocuments(documents.map(d => d.id))}
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDocuments([])}
                >
                  Clear All
                </Button>
              </div>
            </div>
            
            <div className="grid gap-2 max-h-96 overflow-y-auto border rounded-md p-4">
              {documents.map((document) => (
                <div key={document.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={document.id}
                    checked={selectedDocuments.includes(document.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedDocuments(prev => [...prev, document.id]);
                      } else {
                        setSelectedDocuments(prev => prev.filter(id => id !== document.id));
                      }
                    }}
                  />
                  <Label htmlFor={document.id} className="flex-1 cursor-pointer">
                    <div className="flex flex-col">
                      <span className="font-medium">{document.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatDocumentName(document)}
                      </span>
                    </div>
                  </Label>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAccessDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={saveDocumentAccess}>
                Save Access
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
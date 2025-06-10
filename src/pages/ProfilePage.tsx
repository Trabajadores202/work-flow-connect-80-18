import { useState, useEffect, useRef } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { X, Camera, Edit, Trash2, AlertTriangle, Upload } from 'lucide-react';
import { useJobs } from '@/contexts/JobContext';
import { Link } from 'react-router-dom';
import { JobType } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import EditJobForm from '@/components/EditJobForm';
import axios from 'axios';

const ProfilePage = () => {
  const { currentUser, updateUserProfile, uploadProfilePhoto } = useAuth();
  const { skillsList, loadData } = useData();
  const { jobs, updateJob, deleteJob, refreshJobs } = useJobs();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [userJobs, setUserJobs] = useState<JobType[]>([]);
  const [savedJobs, setSavedJobs] = useState<JobType[]>([]);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [editingJob, setEditingJob] = useState<JobType | null>(null);
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isLoadingSavedJobs, setIsLoadingSavedJobs] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    bio: currentUser?.bio || '',
    skills: currentUser?.skills || [],
  });

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name || '',
        email: currentUser.email || '',
        bio: currentUser.bio || '',
        skills: currentUser.skills || [],
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (Array.isArray(jobs)) {
      setUserJobs(jobs.filter(job => job.userId === currentUser?.id));
    }
  }, [jobs, currentUser]);
  
  // Load saved jobs when component mounts
  useEffect(() => {
    const loadSavedJobs = async () => {
      if (!currentUser) return;
      
      setIsLoadingSavedJobs(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await axios.get(
          `${API_URL}/jobs/user/saved`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        if (response.data.success) {
          setSavedJobs(response.data.jobs || []);
        }
      } catch (error) {
        console.error('Error loading saved jobs:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las propuestas guardadas"
        });
      } finally {
        setIsLoadingSavedJobs(false);
      }
    };
    
    loadSavedJobs();
  }, [currentUser]);
  
  const handleEditJob = (job: JobType) => {
    setEditingJob(job);
  };
  
  const handleCancelEdit = () => {
    setEditingJob(null);
  };
  
  const handleUpdateJob = async (jobData: Partial<JobType>) => {
    if (!editingJob) return;
    
    setIsSubmittingJob(true);
    try {
      console.log('Updating job with ID:', editingJob.id, 'and data:', jobData);
      await updateJob(editingJob.id, jobData);
      
      // Actualizamos la lista de trabajos después de la modificación
      await refreshJobs();
      
      setEditingJob(null);
      
      toast({
        title: "Propuesta actualizada",
        description: "Los cambios han sido guardados correctamente"
      });
    } catch (error) {
      console.error('Error updating job:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la propuesta"
      });
    } finally {
      setIsSubmittingJob(false);
    }
  };
  
  const handleDeleteJob = async (jobId: string) => {
    try {
      console.log('Deleting job with ID:', jobId);
      const success = await deleteJob(jobId);
      
      if (success) {
        // La lista de trabajos ya se actualiza en el contexto,
        // pero actualizamos la lista local por si acaso
        setUserJobs(userJobs.filter(job => job.id !== jobId));
        
        toast({
          title: "Propuesta eliminada",
          description: "La propuesta ha sido eliminada correctamente"
        });
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la propuesta"
      });
    }
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    
    setIsUpdating(true);
    try {
      await updateUserProfile({
        name: profileForm.name,
        bio: profileForm.bio,
        skills: profileForm.skills,
      });
      
      toast({
        title: "Perfil actualizado",
        description: "Tus cambios han sido guardados correctamente"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron guardar los cambios"
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleAddSkill = (skill: string) => {
    if (!skill || profileForm.skills.includes(skill)) return;
    setProfileForm({
      ...profileForm,
      skills: [...profileForm.skills, skill]
    });
    setSelectedSkill('');
  };
  
  const handleRemoveSkill = (skill: string) => {
    setProfileForm({
      ...profileForm,
      skills: profileForm.skills.filter(s => s !== skill)
    });
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      
      const objectUrl = URL.createObjectURL(file);
      setPreviewImage(objectUrl);
      
      return () => URL.revokeObjectURL(objectUrl);
    }
  };
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleUploadImage = async () => {
    if (!selectedImage || !currentUser) {
      return;
    }
    
    setIsUploadingPhoto(true);
    try {
      const photoURL = await uploadProfilePhoto(selectedImage);
      
      toast({
        title: "Foto actualizada",
        description: "Tu foto de perfil ha sido actualizada correctamente"
      });
      
      setSelectedImage(null);
    } catch (error) {
      console.error('Error al subir la imagen:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo subir la foto de perfil"
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (!currentUser) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p>Debes iniciar sesión para ver tu perfil.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full md:w-[400px] grid-cols-3">
            <TabsTrigger value="profile">Mi Perfil</TabsTrigger>
            <TabsTrigger value="proposals">Mis Propuestas</TabsTrigger>
            <TabsTrigger value="saved">Guardadas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="mt-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="dark:text-white">Información de perfil</CardTitle>
                    <CardDescription className="dark:text-gray-300">
                      Actualiza tu información para que los clientes te conozcan mejor.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="dark:text-gray-200">Nombre</Label>
                      <Input
                        id="name"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                        className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email" className="dark:text-gray-200">Correo electrónico</Label>
                      <Input
                        id="email"
                        value={profileForm.email}
                        disabled
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No se puede cambiar el correo electrónico
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio" className="dark:text-gray-200">Biografía</Label>
                      <Textarea
                        id="bio"
                        placeholder="Cuéntanos sobre ti, tu experiencia y las áreas en las que trabajas"
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                        className="min-h-[120px] dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="dark:text-gray-200">Habilidades</Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {profileForm.skills.map((skill, index) => (
                          <Badge key={index} className="bg-wfc-purple-medium text-white hover:bg-wfc-purple-medium">
                            {skill}
                            <button 
                              className="ml-1 hover:bg-wfc-purple rounded-full" 
                              onClick={() => handleRemoveSkill(skill)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Select value={selectedSkill} onValueChange={handleAddSkill}>
                          <SelectTrigger className="w-full dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                            <SelectValue placeholder="Seleccionar habilidad" />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                            {skillsList
                              .filter(skill => !profileForm.skills.includes(skill))
                              .map((skill, index) => (
                                <SelectItem 
                                  key={index} 
                                  value={skill}
                                  className="dark:text-white dark:focus:text-white dark:focus:bg-gray-700"
                                >
                                  {skill}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full md:w-auto bg-wfc-purple hover:bg-wfc-purple-medium"
                      onClick={handleUpdateProfile}
                      disabled={isUpdating}
                    >
                      {isUpdating ? "Guardando..." : "Guardar cambios"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="dark:text-white">Foto de perfil</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <Avatar className="h-24 w-24 mb-4 relative group">
                      <AvatarImage 
                        src={previewImage || currentUser.photoURL || ''} 
                        alt={currentUser.name} 
                      />
                      <AvatarFallback className="bg-wfc-purple-medium text-white text-2xl">
                        {currentUser.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                      
                      <div 
                        className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={triggerFileInput}
                      >
                        <Camera className="text-white h-10 w-10" />
                      </div>
                    </Avatar>
                    
                    <input
                      type="file"
                      id="profile-photo"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    
                    <div className="space-y-2 w-full">
                      <Button 
                        variant="outline" 
                        className="w-full dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-wfc-purple dark:hover:text-white" 
                        type="button"
                        onClick={triggerFileInput}
                      >
                        <Camera className="h-4 w-4 mr-1" /> Elegir foto
                      </Button>
                      
                      {selectedImage && (
                        <Button 
                          className="w-full bg-wfc-purple hover:bg-wfc-purple-medium"
                          onClick={handleUploadImage}
                          disabled={isUploadingPhoto}
                        >
                          {isUploadingPhoto ? "Subiendo..." : <><Upload className="h-4 w-4 mr-1" /> Subir foto</>}
                        </Button>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                      Imagen PNG, JPG o GIF, máximo 2MB
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="dark:text-white">Estadísticas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Propuestas publicadas</span>
                        <span className="font-medium dark:text-white">{userJobs.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Propuestas guardadas</span>
                        <span className="font-medium dark:text-white">{savedJobs.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Calificación</span>
                        <span className="font-medium dark:text-white">5.0 ⭐</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Miembro desde</span>
                        <span className="font-medium dark:text-white">
                          {currentUser.joinedAt ? formatDate(currentUser.joinedAt) : "Apr 2025"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="proposals" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="dark:text-white">Mis Propuestas</CardTitle>
                <CardDescription className="dark:text-gray-300">
                  Propuestas de trabajo que has publicado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userJobs.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500 dark:text-gray-400">Aún no has publicado ninguna propuesta</p>
                    <Button 
                      className="mt-4 bg-wfc-purple hover:bg-wfc-purple-medium"
                      onClick={() => window.location.href = '/create-job'}
                    >
                      Crear nueva propuesta
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {editingJob ? (
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h3 className="font-medium dark:text-white mb-4">Editar propuesta</h3>
                        <EditJobForm 
                          job={editingJob}
                          onSubmit={handleUpdateJob}
                          onCancel={handleCancelEdit}
                          isSubmitting={isSubmittingJob}
                        />
                      </div>
                    ) : (
                      userJobs.map((job) => (
                        <div 
                          key={job.id} 
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-wfc-purple dark:hover:border-wfc-purple"
                        >
                          <div className="flex flex-col md:flex-row justify-between">
                            <div>
                              <h3 className="font-medium dark:text-white">
                                <Link to={`/jobs/${job.id}`} className="hover:text-wfc-purple">
                                  {job.title}
                                </Link>
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Publicado el {job.createdAt ? formatDate(job.createdAt) : "-"} • {job.comments?.length || 0} comentarios
                              </p>
                            </div>
                            <div className="mt-2 md:mt-0">
                              <Badge className={`
                                ${job.status === 'open' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                                  job.status === 'in progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
                                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}
                              `}>
                                {job.status === 'open' ? 'Abierto' : 
                                  job.status === 'in progress' ? 'En progreso' : 
                                  'Completado'}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex mt-4 space-x-3">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEditJob(job)}
                              className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white dark:text-blue-400 dark:border-blue-400 dark:hover:bg-blue-800"
                            >
                              <Edit className="h-4 w-4 mr-1" /> Editar
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white dark:text-red-400 dark:border-red-400 dark:hover:bg-red-800"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="dark:text-white flex items-center">
                                    <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                                    Eliminar propuesta
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="dark:text-gray-300">
                                    ¿Estás seguro de que quieres eliminar esta propuesta? Esta acción no se puede deshacer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteJob(job.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="saved" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="dark:text-white">Propuestas Guardadas</CardTitle>
                <CardDescription className="dark:text-gray-300">
                  Propuestas de trabajo que has guardado para revisar más tarde
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSavedJobs ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500 dark:text-gray-400">Cargando propuestas guardadas...</p>
                  </div>
                ) : savedJobs.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500 dark:text-gray-400">Aún no has guardado ninguna propuesta</p>
                    <Button 
                      className="mt-4 bg-wfc-purple hover:bg-wfc-purple-medium"
                      onClick={() => window.location.href = '/jobs'}
                    >
                      Explorar propuestas
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {savedJobs.map((job) => (
                      <div 
                        key={job.id} 
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-wfc-purple dark:hover:border-wfc-purple"
                      >
                        <div className="flex flex-col md:flex-row justify-between">
                          <div>
                            <h3 className="font-medium dark:text-white">
                              <Link to={`/jobs/${job.id}`} className="hover:text-wfc-purple">
                                {job.title}
                              </Link>
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Por {job.userName || 'Usuario'} • Presupuesto: ${job.budget}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                              {job.description}
                            </p>
                          </div>
                          <div className="mt-2 md:mt-0 flex flex-col items-end">
                            <Badge className={`
                              ${job.status === 'open' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                                job.status === 'in progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}
                            `}>
                              {job.status === 'open' ? 'Abierto' : 
                                job.status === 'in progress' ? 'En progreso' : 
                                'Completado'}
                            </Badge>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Guardado el {job.savedAt ? formatDate(job.savedAt) : formatDate(job.createdAt)}
                            </p>
                          </div>
                        </div>
                        
                        {job.skills && job.skills.length > 0 && (
                          <div className="mt-3">
                            <div className="flex flex-wrap gap-1">
                              {job.skills.slice(0, 3).map((skill, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {job.skills.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{job.skills.length - 3} más
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex mt-4 space-x-3">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => window.location.href = `/jobs/${job.id}`}
                            className="text-wfc-purple border-wfc-purple hover:bg-wfc-purple hover:text-white"
                          >
                            Ver detalles
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default ProfilePage;

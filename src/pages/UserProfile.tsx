
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import { useData } from '@/contexts/DataContext';
import { useJobs } from '@/contexts/JobContext';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Calendar, Verified, User } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils';
import { UserType, JobType } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { userService } from '@/services/api';

/**
 * Componente de Página de Perfil de Usuario
 * 
 * Esta página muestra el perfil de otro usuario incluyendo:
 * - Información personal del usuario y foto de perfil
 * - Biografía y habilidades del usuario
 * - Botón para contactar/chatear con el usuario
 * - Lista de propuestas publicadas por el usuario
 * 
 * Maneja la lógica para crear un nuevo chat o navegar a uno existente
 * cuando se hace clic en el botón "Contactar".
 */
const UserProfile = () => {
  // Obtener el ID del usuario de los parámetros de la URL
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  // Hooks de contexto para acceder a datos y funcionalidades
  const { getUserById } = useData(); // Para obtener datos del usuario
  const { jobs } = useJobs(); // Para obtener propuestas
  const { currentUser } = useAuth(); // Usuario actual autenticado
  const { createPrivateChat } = useChat(); // Funcionalidades de chat
  const { toast } = useToast();
  
  // Estados para manejo de carga y datos
  const [profileUser, setProfileUser] = useState<UserType | null>(null);
  const [userJobs, setUserJobs] = useState<JobType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Efecto para cargar datos del usuario y sus propuestas
  useEffect(() => {
    const fetchProfileUser = async () => {
      console.log("UserProfile: Iniciando carga de usuario con ID:", userId);
      setIsLoading(true);
      setError(null);
      
      if (!userId) {
        setError("ID de usuario no válido");
        setIsLoading(false);
        return;
      }
      
      try {
        // Si el userId es el mismo que el usuario actual, usamos los datos del usuario actual
        if (currentUser && userId === currentUser.id) {
          console.log("UserProfile: Mostrando perfil del usuario actual:", currentUser);
          setProfileUser(currentUser);
        } else {
          // Cargar el usuario directamente desde el backend
          console.log("UserProfile: Cargando usuario desde el backend con ID:", userId);
          try {
            const user = await userService.getUserById(userId);
            console.log("UserProfile: Usuario cargado exitosamente:", user);
            setProfileUser(user);
          } catch (apiError: any) {
            console.error("UserProfile: Error al cargar usuario desde API:", apiError);
            
            // Intentar con el contexto como fallback
            const contextUser = getUserById(userId);
            if (contextUser) {
              console.log("UserProfile: Usuario encontrado en contexto:", contextUser);
              setProfileUser(contextUser);
            } else {
              throw apiError;
            }
          }
        }
        
        // Cargar trabajos del usuario
        if (jobs && jobs.length > 0) {
          const jobsByUser = jobs.filter(job => job.userId === userId);
          console.log("UserProfile: Propuestas del usuario:", jobsByUser);
          setUserJobs(jobsByUser);
        }
      } catch (error: any) {
        console.error("UserProfile: Error final al cargar datos del perfil:", error);
        setError(error.message || "No se pudieron cargar los datos del usuario");
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "No se pudieron cargar los datos del usuario"
        });
        setProfileUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfileUser();
  }, [userId, getUserById, jobs, toast, currentUser]);
  
  /**
   * Manejar el clic en el botón "Contactar"
   * Esta función abre un chat existente o crea uno nuevo
   */
  const handleContactClick = async () => {
    if (!currentUser || !profileUser) return;
    
    try {
      // Crear un nuevo chat privado con este usuario
      const chatCreated = await createPrivateChat(profileUser.id);
      if (chatCreated) {
        navigate('/chats');
        toast({
          title: "Chat iniciado",
          description: `Has iniciado una conversación con ${profileUser.name}`
        });
      }
    } catch (error) {
      console.error("Error al gestionar el chat:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el chat"
      });
    }
  };

  // Mostrar pantalla de carga
  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-8">
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-[200px_1fr]">
                <div className="flex flex-col items-center text-center">
                  <Skeleton className="h-32 w-32 rounded-full" />
                  <Skeleton className="h-7 w-40 mt-4" />
                  <Skeleton className="h-10 w-full mt-4" />
                </div>
                <div className="space-y-6">
                  <div>
                    <Skeleton className="h-6 w-40 mb-2" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                  <div>
                    <Skeleton className="h-6 w-40 mb-2" />
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Mostrar mensaje si no se encuentra el usuario
  if (error || !profileUser) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <User className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Usuario no encontrado</h2>
          <p className="text-gray-600 mb-4">
            {error || "El usuario que estás buscando no existe o ha sido eliminado."}
          </p>
          <Button className="mt-4" onClick={() => navigate('/dashboard')}>
            Volver al inicio
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Tarjeta de perfil de usuario */}
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-[200px_1fr]">
              {/* Foto de perfil y botón de contacto */}
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={profileUser.photoURL || ''} alt={profileUser.name} />
                  <AvatarFallback className="bg-wfc-purple-medium text-white text-4xl">
                    {profileUser.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold mt-4 flex items-center">
                  {profileUser.name}
                  {(profileUser as any).isVerified && (
                    <Verified className="ml-1 h-5 w-5 text-blue-500" />
                  )}
                </h2>
                
                {/* Solo mostrar botón de contacto si no es el usuario actual */}
                {currentUser && currentUser.id !== userId && (
                  <Button 
                    className="mt-4 w-full bg-wfc-purple hover:bg-wfc-purple-medium transition-colors transform hover:scale-[1.02] active:scale-[0.98] duration-200"
                    onClick={handleContactClick}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Contactar
                  </Button>
                )}
              </div>
              
              {/* Información del usuario */}
              <div className="space-y-6">
                {/* Biografía */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Biografía</h3>
                  {profileUser.bio ? (
                    <p className="text-gray-700">{profileUser.bio}</p>
                  ) : (
                    <p className="text-gray-500 italic">Este usuario no ha agregado una biografía.</p>
                  )}
                </div>
                
                {/* Habilidades */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Habilidades</h3>
                  {profileUser.skills && profileUser.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profileUser.skills.map((skill, index) => (
                        <Badge key={index} className="bg-wfc-purple-medium text-white hover:bg-wfc-purple-dark">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No se han agregado habilidades</p>
                  )}
                </div>
                
                {/* Información adicional */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm text-gray-600 mb-1">Email</h4>
                    <p>{profileUser.email}</p>
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-600 mb-1">Miembro desde</h4>
                    <p>
                      {profileUser.joinedAt || profileUser.createdAt ? (
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(new Date(profileUser.joinedAt || profileUser.createdAt))}
                        </span>
                      ) : (
                        "Fecha no disponible"
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Propuestas del usuario */}
        <Card>
          <CardHeader>
            <CardTitle>Propuestas de {profileUser.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {userJobs.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">Este usuario aún no ha publicado propuestas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userJobs.map((job) => (
                  <div 
                    key={job.id} 
                    className="border border-gray-200 rounded-lg p-4 hover:border-wfc-purple hover:shadow-md cursor-pointer transition-all duration-200"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <div className="flex flex-col md:flex-row justify-between">
                      <div>
                        <h3 className="font-medium">{job.title}</h3>
                        <p className="text-sm text-gray-500">
                          Publicado el {formatDate(typeof job.createdAt === 'string' ? new Date(job.createdAt) : job.createdAt)}
                        </p>
                      </div>
                      <div className="mt-2 md:mt-0">
                        <Badge className={`
                          ${job.status === 'open' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 
                            job.status === 'in progress' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : 
                            'bg-gray-100 text-gray-800 hover:bg-gray-200'}
                          transition-colors duration-200
                        `}>
                          {job.status === 'open' ? 'Abierto' : 
                            job.status === 'in progress' ? 'En progreso' : 
                            'Completado'}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">{job.description}</p>
                    {job.skills && job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {job.skills.slice(0, 3).map((skill, index) => (
                          <Badge key={index} variant="outline" className="bg-gray-50 text-xs hover:bg-gray-100 transition-colors">
                            {skill}
                          </Badge>
                        ))}
                        {job.skills.length > 3 && (
                          <Badge variant="outline" className="bg-gray-50 text-xs hover:bg-gray-100 transition-colors">
                            +{job.skills.length - 3} más
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default UserProfile;

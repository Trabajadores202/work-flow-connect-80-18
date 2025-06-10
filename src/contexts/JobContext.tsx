import { createContext, useContext, useState, useEffect } from 'react';
import { JobType, CommentType, ReplyType, UserType } from '@/types';
import { jobService } from '@/lib/jobService';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { toast } from '@/components/ui/use-toast';

export interface JobContextType {
  jobs: JobType[];
  userJobs: JobType[];
  filteredJobs: JobType[];
  setFilteredJobs: (jobs: JobType[]) => void;
  popularJobs: JobType[];
  getJobById: (id: string) => JobType | undefined;
  loading: boolean;
  addComment: (jobId: string, text: string) => Promise<CommentType | undefined>;
  updateComment: (commentId: string, text: string) => Promise<CommentType | undefined>;
  deleteComment: (commentId: string) => Promise<boolean>;
  addReply: (commentId: string, jobId: string, text: string) => Promise<ReplyType | undefined>;
  updateReply: (replyId: string, text: string) => Promise<ReplyType | undefined>;
  deleteReply: (replyId: string) => Promise<boolean>;
  addReplyToComment: (jobId: string, commentId: string, text: string, user: UserType) => Promise<void>;
  refreshJobs: () => Promise<void>;
  saveJob: (jobId: string) => Promise<void>;
  unsaveJob: (jobId: string) => Promise<void>;
  savedJobs: JobType[];
  createJob: (jobData: Partial<JobType>) => Promise<JobType | null>;
  updateJob: (jobId: string, jobData: Partial<JobType>) => Promise<JobType | null>;
  deleteJob: (jobId: string) => Promise<boolean>;
}

const JobContext = createContext<JobContextType | null>(null);

export const useJobs = () => {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJobs must be used within a JobProvider');
  }
  return context;
};

export const JobProvider = ({ children }: { children: React.ReactNode }) => {
  const [jobs, setJobs] = useState<JobType[]>([]);
  const [userJobs, setUserJobs] = useState<JobType[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobType[]>([]);
  const [popularJobs, setPopularJobs] = useState<JobType[]>([]);
  const [savedJobs, setSavedJobs] = useState<JobType[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const { getUserById } = useData();

  useEffect(() => {
    refreshJobs();
  }, [currentUser]);

  const refreshJobs = async () => {
    setLoading(true);
    try {
      const allJobs = await jobService.getAllJobs();
      
      // Process the jobs to ensure they have the correct format
      const processedJobs = allJobs.map(job => ({
        ...job,
        // Ensure dates are strings
        createdAt: job.createdAt ? job.createdAt.toString() : new Date().toString(),
        updatedAt: job.updatedAt ? job.updatedAt.toString() : new Date().toString(),
        // Ensure username is present
        userName: job.userName || 'Usuario desconocido'
      }));
      
      setJobs(processedJobs);
      setFilteredJobs(processedJobs);

      if (currentUser) {
        const userJobsData = await jobService.getJobsByUser(currentUser.id);
        // Process user jobs as well
        const processedUserJobs = userJobsData.map(job => ({
          ...job,
          createdAt: job.createdAt ? job.createdAt.toString() : new Date().toString(),
          updatedAt: job.updatedAt ? job.updatedAt.toString() : new Date().toString(),
          userName: job.userName || 'Usuario desconocido'
        }));
        setUserJobs(processedUserJobs);

        // In a real implementation, we would fetch saved jobs from the backend
        setSavedJobs([]);
      }

      // For popular jobs, we're showing the first 3 most recent jobs
      const popularJobsTemp = processedJobs.slice(0, 3);
      setPopularJobs(popularJobsTemp);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al cargar los trabajos."
      });
    } finally {
      setLoading(false);
    }
  };

  const getJobById = (id: string) => {
    return jobs.find(job => job.id === id);
  };

  const createJob = async (jobData: Partial<JobType>): Promise<JobType | null> => {
    try {
      const createdJob = await jobService.createJob(jobData);
      
      // Refresh jobs after creating a new one
      await refreshJobs();
      
      // NO mostramos toast aquí - se debe manejar en el componente que llama esta función
      
      return createdJob;
    } catch (error) {
      console.error("Error creating job:", error);
      // Solo lanzamos el error para que el componente lo maneje
      throw error;
    }
  };

  const updateJob = async (jobId: string, jobData: Partial<JobType>): Promise<JobType | null> => {
    try {
      const updatedJob = await jobService.updateJob(jobId, jobData);
      
      if (updatedJob) {
        // Actualizar el estado local reemplazando el trabajo actualizado
        setJobs(prevJobs => 
          prevJobs.map(job => job.id === jobId ? updatedJob : job)
        );
        
        setUserJobs(prevJobs => 
          prevJobs.map(job => job.id === jobId ? updatedJob : job)
        );
        
        setFilteredJobs(prevJobs => 
          prevJobs.map(job => job.id === jobId ? updatedJob : job)
        );
      }
      
      // NO mostramos toast aquí - se debe manejar en el componente que llama esta función
      
      return updatedJob;
    } catch (error) {
      console.error("Error updating job:", error);
      // Solo lanzamos el error para que el componente lo maneje
      throw error;
    }
  };

  const deleteJob = async (jobId: string): Promise<boolean> => {
    try {
      const success = await jobService.deleteJob(jobId);
      
      if (success) {
        // Eliminar el trabajo del estado local
        setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
        setUserJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
        setFilteredJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
        
        // NO mostramos toast aquí - se debe manejar en el componente que llama esta función
        
        return true;
      } else {
        // Solo lanzamos el error para que el componente lo maneje
        throw new Error("No se pudo eliminar la propuesta");
      }
    } catch (error: any) {
      console.error("Error deleting job:", error);
      // Solo lanzamos el error para que el componente lo maneje
      throw error;
    }
  };

  const addComment = async (jobId: string, text: string): Promise<CommentType | undefined> => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes iniciar sesión para comentar."
      });
      return;
    }

    try {
      // Send the comment to the backend
      const comment = await jobService.addComment(jobId, text);
      
      // Ensure the comment has the user information
      const commentWithUser = {
        ...comment,
        userName: currentUser.name,
        userPhoto: currentUser.photoURL || '',
        userId: currentUser.id
      };
      
      // Update the jobs state with the new comment
      setJobs(prevJobs => {
        return prevJobs.map(job => {
          if (job.id === jobId) {
            const updatedComments = [...(job.comments || []), commentWithUser];
            return { ...job, comments: updatedComments };
          }
          return job;
        });
      });
      
      toast({
        title: "Comentario publicado",
        description: "Tu comentario ha sido publicado correctamente."
      });
      
      return commentWithUser;
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al publicar el comentario."
      });
    }
  };

  const updateComment = async (commentId: string, text: string): Promise<CommentType | undefined> => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes iniciar sesión para editar comentarios."
      });
      return;
    }

    try {
      // Send the update to the backend
      const updatedComment = await jobService.updateComment(commentId, text);
      
      // Update the jobs state with the updated comment
      setJobs(prevJobs => {
        return prevJobs.map(job => {
          if (job.comments) {
            const commentExists = job.comments.some(comment => comment.id === commentId);
            if (commentExists) {
              const updatedComments = job.comments.map(comment => 
                comment.id === commentId ? updatedComment : comment
              );
              return { ...job, comments: updatedComments };
            }
          }
          return job;
        });
      });
      
      toast({
        title: "Comentario actualizado",
        description: "Tu comentario ha sido actualizado correctamente."
      });
      
      return updatedComment;
    } catch (error) {
      console.error("Error updating comment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al actualizar el comentario."
      });
    }
  };

  const deleteComment = async (commentId: string): Promise<boolean> => {
    try {
      const success = await jobService.deleteComment(commentId);
      
      if (success) {
        // Update the jobs state by removing the deleted comment
        setJobs(prevJobs => {
          return prevJobs.map(job => {
            const updatedComments = job.comments?.filter(comment => comment.id !== commentId);
            return { ...job, comments: updatedComments };
          });
        });
        
        toast({
          title: "Comentario eliminado",
          description: "El comentario ha sido eliminado correctamente."
        });
        return true;
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Error al eliminar el comentario."
        });
        return false;
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al eliminar el comentario."
      });
      return false;
    }
  };

  const addReply = async (commentId: string, jobId: string, text: string): Promise<ReplyType | undefined> => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes iniciar sesión para responder."
      });
      return;
    }

    try {
      // Send the reply to the backend
      const reply = await jobService.addReply(jobId, commentId, text);
      
      // Ensure the reply has the user information
      const replyWithUser = {
        ...reply,
        userName: currentUser.name,
        userPhoto: currentUser.photoURL || '',
        userId: currentUser.id
      };
      
      // Update the jobs state with the new reply
      setJobs(prevJobs => {
        return prevJobs.map(job => {
          if (job.id === jobId) {
            const updatedComments = job.comments?.map(comment => {
              if (comment.id === commentId) {
                const updatedReplies = [...(comment.replies || []), replyWithUser];
                return { ...comment, replies: updatedReplies };
              }
              return comment;
            });
            return { ...job, comments: updatedComments };
          }
          return job;
        });
      });
      
      toast({
        title: "Respuesta publicada",
        description: "Tu respuesta ha sido publicada correctamente."
      });
      
      return replyWithUser;
    } catch (error) {
      console.error("Error adding reply:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al publicar la respuesta."
      });
    }
  };

  const updateReply = async (replyId: string, text: string): Promise<ReplyType | undefined> => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes iniciar sesión para editar respuestas."
      });
      return;
    }

    try {
      // Send the update to the backend
      const updatedReply = await jobService.updateReply(replyId, text);
      
      // Update the jobs state with the updated reply
      setJobs(prevJobs => {
        return prevJobs.map(job => {
          if (job.comments) {
            const updatedComments = job.comments.map(comment => {
              if (comment.replies) {
                const replyExists = comment.replies.some(reply => reply.id === replyId);
                if (replyExists) {
                  const updatedReplies = comment.replies.map(reply =>
                    reply.id === replyId ? updatedReply : reply
                  );
                  return { ...comment, replies: updatedReplies };
                }
              }
              return comment;
            });
            return { ...job, comments: updatedComments };
          }
          return job;
        });
      });
      
      toast({
        title: "Respuesta actualizada",
        description: "Tu respuesta ha sido actualizada correctamente."
      });
      
      return updatedReply;
    } catch (error) {
      console.error("Error updating reply:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al actualizar la respuesta."
      });
    }
  };

  const deleteReply = async (replyId: string): Promise<boolean> => {
    try {
      const success = await jobService.deleteReply(replyId);
      
      if (success) {
        // Update the jobs state by removing the deleted reply
        setJobs(prevJobs => {
          return prevJobs.map(job => {
            if (job.comments) {
              const updatedComments = job.comments.map(comment => {
                if (comment.replies) {
                  const updatedReplies = comment.replies.filter(reply => reply.id !== replyId);
                  return { ...comment, replies: updatedReplies };
                }
                return comment;
              });
              return { ...job, comments: updatedComments };
            }
            return job;
          });
        });
        
        toast({
          title: "Respuesta eliminada",
          description: "La respuesta ha sido eliminada correctamente."
        });
        return true;
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Error al eliminar la respuesta."
        });
        return false;
      }
    } catch (error) {
      console.error("Error deleting reply:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al eliminar la respuesta."
      });
      return false;
    }
  };

  const addReplyToComment = async (jobId: string, commentId: string, text: string, user: UserType) => {
    try {
      // Send the reply to the backend
      const reply = await jobService.addReply(jobId, commentId, text);
      
      // Create a new reply with the user's information
      const replyWithUser: ReplyType = {
        ...reply,
        userName: user.name,
        userPhoto: user.photoURL || '',
        userId: user.id,
        timestamp: Date.now()
      };
      
      // Update the jobs state with the new reply
      setJobs(prevJobs => {
        return prevJobs.map(job => {
          if (job.id === jobId) {
            const updatedComments = job.comments?.map(comment => {
              if (comment.id === commentId) {
                const updatedReplies = [...(comment.replies || []), replyWithUser];
                return { ...comment, replies: updatedReplies };
              }
              return comment;
            });
            return { ...job, comments: updatedComments };
          }
          return job;
        });
      });
    } catch (error) {
      console.error("Error adding reply:", error);
      throw error;
    }
  };

  const saveJob = async (jobId: string) => {
    // This will be implemented when job saving functionality is added
    toast({
      title: "Funcionalidad no implementada",
      description: "La funcionalidad de guardar trabajos será implementada próximamente."
    });
  };

  const unsaveJob = async (jobId: string) => {
    // This will be implemented when job saving functionality is added
    toast({
      title: "Funcionalidad no implementada",
      description: "La funcionalidad de quitar trabajos guardados será implementada próximamente."
    });
  };

  const value: JobContextType = {
    jobs,
    userJobs,
    filteredJobs,
    setFilteredJobs,
    popularJobs,
    getJobById,
    loading,
    addComment,
    updateComment,
    deleteComment,
    addReply,
    updateReply,
    deleteReply,
    refreshJobs,
    saveJob,
    unsaveJob,
    savedJobs,
    createJob,
    updateJob,
    deleteJob,
    addReplyToComment
  };

  return (
    <JobContext.Provider value={value}>
      {children}
    </JobContext.Provider>
  );
};

export default JobContext;

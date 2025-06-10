
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Edit, Trash2, Reply, Check, X } from 'lucide-react';
import { CommentType, ReplyType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useJobs } from '@/contexts/JobContext';
import { toast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import axios from 'axios';

type CommentItemProps = {
  comment: CommentType;
  jobId: string;
};

export const CommentItem: React.FC<CommentItemProps> = ({ comment, jobId }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [localReplies, setLocalReplies] = useState<ReplyType[]>([]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  
  // Para las respuestas
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyContent, setEditReplyContent] = useState('');
  const [isSubmittingReplyEdit, setIsSubmittingReplyEdit] = useState(false);
  
  const { currentUser } = useAuth();

  // Inicializa las respuestas locales con las respuestas del comentario
  useEffect(() => {
    if (comment.replies && comment.replies.length > 0) {
      setLocalReplies(comment.replies);
    }
  }, [comment.replies]);
  
  // Para inicializar el contenido de edición cuando comienza a editar
  useEffect(() => {
    if (isEditing) {
      setEditContent(comment.text || comment.content || '');
    }
  }, [isEditing, comment]);

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !currentUser) return;
    
    setIsSubmittingReply(true);
    try {
      // Send the reply directly to the backend API without using context methods
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await axios.post(
        `${API_URL}/jobs/${jobId}/comments/${comment.id}/replies`,
        { content: replyContent },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.data.success && response.data.reply) {
        // Format the reply to match the expected structure
        const newReply: ReplyType = {
          ...response.data.reply,
          text: response.data.reply.content,
          timestamp: new Date(response.data.reply.createdAt).getTime()
        };
        
        // Update local state with the new reply
        setLocalReplies(prev => [...prev, newReply]);
        
        setReplyContent('');
        setShowReplyForm(false);
        
        // Only show toast once
        toast({
          title: "Respuesta enviada",
          description: "Tu respuesta ha sido publicada correctamente"
        });
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo enviar la respuesta"
      });
    } finally {
      setIsSubmittingReply(false);
    }
  };
  
  const handleSubmitEdit = async () => {
    if (!editContent.trim() || !currentUser) return;
    
    setIsSubmittingEdit(true);
    try {
      // Update comment directly via API instead of using context
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await axios.put(
        `${API_URL}/jobs/comments/${comment.id}`,
        { content: editContent },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.data.success) {
        // Update local comment content
        comment.text = response.data.comment.content;
        comment.content = response.data.comment.content;
        
        setIsEditing(false);
        
        // Only show toast once
        toast({
          title: "Comentario actualizado",
          description: "Tu comentario ha sido actualizado correctamente"
        });
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el comentario"
      });
    } finally {
      setIsSubmittingEdit(false);
    }
  };
  
  const handleDeleteComment = async () => {
    try {
      // Delete comment directly via API instead of using context
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await axios.delete(
        `${API_URL}/jobs/comments/${comment.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.data.success) {
        // Only show toast once
        toast({
          title: "Comentario eliminado",
          description: "El comentario ha sido eliminado correctamente"
        });
        
        // Optionally trigger a page refresh or parent component update
        window.location.reload();
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el comentario"
      });
    }
  };
  
  const handleSubmitReplyEdit = async (replyId: string) => {
    if (!editReplyContent.trim() || !currentUser) return;
    
    setIsSubmittingReplyEdit(true);
    try {
      // Update reply directly via API
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await axios.put(
        `${API_URL}/jobs/replies/${replyId}`,
        { content: editReplyContent },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.data.success) {
        // Update local replies with the edited reply
        setLocalReplies(prev => 
          prev.map(reply => 
            reply.id === replyId 
              ? { ...reply, text: response.data.reply.content, content: response.data.reply.content } 
              : reply
          )
        );
        
        setEditingReplyId(null);
        
        // Only show toast once
        toast({
          title: "Respuesta actualizada",
          description: "Tu respuesta ha sido actualizada correctamente"
        });
      }
    } catch (error) {
      console.error('Error updating reply:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la respuesta"
      });
    } finally {
      setIsSubmittingReplyEdit(false);
    }
  };
  
  const handleDeleteReply = async (replyId: string) => {
    try {
      // Delete reply directly via API
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await axios.delete(
        `${API_URL}/jobs/replies/${replyId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.data.success) {
        // Remove the deleted reply from local state
        setLocalReplies(prev => prev.filter(reply => reply.id !== replyId));
        
        // Only show toast once
        toast({
          title: "Respuesta eliminada",
          description: "La respuesta ha sido eliminada correctamente"
        });
      }
    } catch (error) {
      console.error('Error deleting reply:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la respuesta"
      });
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const startEditReply = (reply: ReplyType) => {
    setEditingReplyId(reply.id);
    setEditReplyContent(reply.text || reply.content || '');
  };

  const isCommentOwner = currentUser && comment.userId === currentUser.id;

  return (
    <div className="space-y-3">
      {/* Comentario principal */}
      <div className="flex space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.userPhoto} alt={comment.userName} />
          <AvatarFallback className="bg-wfc-purple-medium text-white">
            {comment.userName?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex justify-between">
            <h4 className="font-medium text-sm">{comment.userName}</h4>
            <span className="text-xs text-gray-500">
              {formatDate(comment.timestamp)} {formatTime(comment.timestamp)}
            </span>
          </div>
          
          {isEditing ? (
            <div className="mt-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[80px] text-sm"
              />
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="mr-2"
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmittingEdit}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmitEdit}
                  disabled={isSubmittingEdit || !editContent.trim()}
                  className="bg-wfc-purple hover:bg-wfc-purple-medium"
                >
                  <Check className="h-4 w-4 mr-1" />
                  {isSubmittingEdit ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-700 text-sm mt-1">{comment.text || comment.content}</p>
              
              <div className="flex items-center mt-1 space-x-3">
                {currentUser && (
                  <button
                    onClick={() => setShowReplyForm(!showReplyForm)}
                    className="text-xs text-wfc-purple flex items-center hover:text-wfc-purple-dark"
                  >
                    <Reply className="h-3 w-3 mr-1" />
                    {showReplyForm ? 'Cancelar' : 'Responder'}
                  </button>
                )}
                
                {isCommentOwner && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-xs text-blue-500 flex items-center hover:text-blue-700"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="text-xs text-red-500 flex items-center hover:text-red-700">
                          <Trash2 className="h-3 w-3 mr-1" />
                          Eliminar
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará tu comentario y todas sus respuestas. Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleDeleteComment}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Formulario de respuesta */}
      {showReplyForm && (
        <div className="ml-11 mt-2">
          <Textarea
            placeholder="Escribe tu respuesta..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="min-h-[80px] text-sm"
          />
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              variant="outline"
              className="mr-2 hover:bg-gray-100"
              onClick={() => setShowReplyForm(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitReply}
              disabled={isSubmittingReply || !replyContent.trim()}
              className="bg-wfc-purple hover:bg-wfc-purple-medium"
            >
              {isSubmittingReply ? 'Enviando...' : 'Responder'}
            </Button>
          </div>
        </div>
      )}

      {/* Respuestas */}
      {localReplies.length > 0 && (
        <div className="ml-11 space-y-3 border-l-2 border-gray-100 pl-3">
          {localReplies.map((reply: ReplyType) => (
            <div key={reply.id} className="flex space-x-3">
              <Avatar className="h-6 w-6">
                <AvatarImage src={reply.userPhoto} alt={reply.userName} />
                <AvatarFallback className="bg-wfc-purple-light text-white text-xs">
                  {reply.userName?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex justify-between">
                  <h4 className="font-medium text-xs">{reply.userName}</h4>
                  <span className="text-xs text-gray-500">
                    {formatDate(reply.timestamp)} {formatTime(reply.timestamp)}
                  </span>
                </div>
                
                {editingReplyId === reply.id ? (
                  <div className="mt-2">
                    <Textarea
                      value={editReplyContent}
                      onChange={(e) => setEditReplyContent(e.target.value)}
                      className="min-h-[60px] text-xs"
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="mr-2 h-7 text-xs"
                        onClick={() => setEditingReplyId(null)}
                        disabled={isSubmittingReplyEdit}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSubmitReplyEdit(reply.id)}
                        disabled={isSubmittingReplyEdit || !editReplyContent.trim()}
                        className="bg-wfc-purple hover:bg-wfc-purple-medium h-7 text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        {isSubmittingReplyEdit ? 'Guardando...' : 'Guardar'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-700 text-xs mt-1">{reply.text || reply.content}</p>
                    
                    {currentUser && reply.userId === currentUser.id && (
                      <div className="flex items-center mt-1 space-x-2">
                        <button
                          onClick={() => startEditReply(reply)}
                          className="text-xs text-blue-500 flex items-center hover:text-blue-700"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="text-xs text-red-500 flex items-center hover:text-red-700">
                              <Trash2 className="h-3 w-3 mr-1" />
                              Eliminar
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará tu respuesta. Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteReply(reply.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { JobType } from '@/types';
import { useData } from '@/contexts/DataContext';

type EditJobFormProps = {
  job: JobType;
  onSubmit: (jobData: Partial<JobType>) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
};

const EditJobForm = ({ job, onSubmit, onCancel, isSubmitting }: EditJobFormProps) => {
  const { jobCategories, skillsList } = useData();

  const [formData, setFormData] = useState({
    title: job.title,
    description: job.description,
    budget: job.budget,
    category: job.category,
    skills: job.skills || [],
    status: job.status
  });

  const [selectedSkill, setSelectedSkill] = useState('');

  // Estados disponibles para las propuestas
  const jobStatuses = [
    { value: 'open', label: 'Abierto' },
    { value: 'in_progress', label: 'En progreso' },
    { value: 'completed', label: 'Completado' },
    { value: 'closed', label: 'Cerrado' }
  ];

  const handleAddSkill = (skill: string) => {
    if (!skill || formData.skills.includes(skill)) return;
    setFormData({
      ...formData,
      skills: [...formData.skills, skill]
    });
    setSelectedSkill('');
  };
  
  const handleRemoveSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(s => s !== skill)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("Submitting job data:", formData);
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title" className="dark:text-gray-200">Título</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="dark:text-gray-200">Descripción</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="min-h-[120px] dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="budget" className="dark:text-gray-200">Presupuesto ($)</Label>
        <Input
          id="budget"
          type="number"
          min="1"
          value={formData.budget}
          onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
          className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category" className="dark:text-gray-200">Categoría</Label>
        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
          <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700 dark:text-white">
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
            {jobCategories.map((category) => (
              <SelectItem 
                key={category} 
                value={category}
                className="dark:text-white dark:focus:text-white dark:focus:bg-gray-700"
              >
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status" className="dark:text-gray-200">Estado de la propuesta</Label>
        <Select 
          value={formData.status} 
          onValueChange={(value: 'open' | 'in_progress' | 'completed' | 'closed') => 
            setFormData({ ...formData, status: value })
          }
        >
          <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700 dark:text-white">
            <SelectValue placeholder="Selecciona un estado" />
          </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
            {jobStatuses.map((status) => (
              <SelectItem 
                key={status.value} 
                value={status.value}
                className="dark:text-white dark:focus:text-white dark:focus:bg-gray-700"
              >
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="dark:text-gray-200">Habilidades requeridas</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.skills.map((skill, index) => (
            <Badge key={index} className="bg-wfc-purple-medium text-white hover:bg-wfc-purple-medium">
              {skill}
              <button 
                type="button"
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
                .filter(skill => !formData.skills.includes(skill))
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

      <div className="flex space-x-2 pt-4">
        <Button
          type="submit"
          className="bg-wfc-purple hover:bg-wfc-purple-medium"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Guardando..." : "Guardar cambios"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="dark:bg-gray-800 dark:border-gray-700 dark:text-white hover:dark:bg-gray-700"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default EditJobForm;

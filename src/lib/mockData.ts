import { UserType, JobType, ChatType, MessageType } from '@/types';

export const mockUsers: UserType[] = [
  {
    id: '1',
    name: 'Ana García',
    email: 'ana@email.com',
    role: 'Frontend Developer',
    location: 'Madrid, España',
    skills: ['React', 'TypeScript', 'CSS'],
    bio: 'Desarrolladora frontend con 5 años de experiencia',
    status: 'online'
  },
  {
    id: '2',
    name: 'Carlos López',
    email: 'carlos@email.com',
    role: 'Backend Developer',
    location: 'Barcelona, España',
    skills: ['Node.js', 'Python', 'MongoDB'],
    bio: 'Especialista en desarrollo backend y APIs',
    status: 'offline'
  },
  {
    id: '3',
    name: 'María Rodríguez',
    email: 'maria@email.com',
    role: 'UI/UX Designer',
    location: 'Valencia, España',
    skills: ['Figma', 'Adobe XD', 'Photoshop'],
    bio: 'Diseñadora con enfoque en experiencia de usuario',
    status: 'online'
  },
  {
    id: '4',
    name: 'David Martín',
    email: 'david@email.com',
    role: 'Full Stack Developer',
    location: 'Sevilla, España',
    skills: ['React', 'Node.js', 'PostgreSQL'],
    bio: 'Desarrollador full stack con pasión por la innovación',
    status: 'online'
  },
  {
    id: '5',
    name: 'Laura Sánchez',
    email: 'laura@email.com',
    role: 'Data Scientist',
    location: 'Bilbao, España',
    skills: ['Python', 'Machine Learning', 'SQL'],
    bio: 'Científica de datos especializada en IA',
    status: 'offline'
  }
];

export const mockJobs: JobType[] = [
  {
    id: '1',
    title: 'Desarrollo de aplicación web React',
    description: 'Necesito desarrollar una aplicación web moderna usando React y TypeScript para gestión de inventarios.',
    budget: 2500,
    category: 'Desarrollo Web',
    skills: ['React', 'TypeScript', 'Node.js'],
    status: 'open',
    userId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Diseño de interfaz para app móvil',
    description: 'Busco diseñador UX/UI para crear la interfaz de una aplicación móvil de fitness.',
    budget: 1200,
    category: 'Diseño',
    skills: ['Figma', 'UI/UX', 'Mobile Design'],
    status: 'in progress',
    userId: '2',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Análisis de datos con Python',
    description: 'Proyecto de análisis de datos de ventas usando Python y machine learning.',
    budget: 1800,
    category: 'Data Science',
    skills: ['Python', 'Pandas', 'Machine Learning'],
    status: 'completed',
    userId: '3',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    title: 'API REST con Node.js',
    description: 'Desarrollo de API REST robusta para sistema de gestión empresarial.',
    budget: 3000,
    category: 'Backend',
    skills: ['Node.js', 'Express', 'MongoDB'],
    status: 'open',
    userId: '4',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '5',
    title: 'Optimización de base de datos',
    description: 'Optimización y mejora del rendimiento de base de datos PostgreSQL existente.',
    budget: 1500,
    category: 'Database',
    skills: ['PostgreSQL', 'SQL', 'Database Optimization'],
    status: 'in progress',
    userId: '5',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Categorías de trabajos
export const JOB_CATEGORIES = [
  'Diseño Web',
  'Desarrollo Móvil',
  'Ciencia de Datos',
  'Diseño UI/UX',
  'Gestión de Proyectos',
  'Desarrollo Frontend',
  'Desarrollo Backend',
  'Marketing Digital'
];

// Lista de habilidades
export const SKILLS_LIST = [
  'HTML',
  'CSS',
  'JavaScript',
  'React',
  'Node.js',
  'Python',
  'Swift',
  'Kotlin',
  'Java',
  'UI Design',
  'UX Design',
  'Figma',
  'Adobe XD',
  'Project Management',
  'Agile',
  'Scrum',
  'Machine Learning',
  'TensorFlow',
  'Data Analysis',
  'Leadership'
];

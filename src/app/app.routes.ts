import { Routes } from '@angular/router';
import { AboutPage } from './pages/about-page';
import { ExplorePage } from './pages/explore-page';
import { HomePage } from './pages/home-page';
import { NotFoundPage } from './pages/not-found-page';
import { StudyPage } from './pages/study-page';

export const routes: Routes = [
  { path: '', component: HomePage, title: 'ATLAS — compreender o mundo' },
  { path: 'explorar', component: ExplorePage, title: 'Explorar a história — ATLAS' },
  { path: 'estudar', component: StudyPage, title: 'Seguir uma trilha — ATLAS' },
  { path: 'sobre', component: AboutPage, title: 'Sobre o ATLAS' },
  { path: '**', component: NotFoundPage, title: 'Página não encontrada — ATLAS' },
];

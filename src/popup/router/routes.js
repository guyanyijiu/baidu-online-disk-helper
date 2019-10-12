import PageIndex from './pages/Index';
import PageLogin from './pages/Login';
import PageTasks from './pages/Tasks';
import PageDirs from './pages/Dirs';
import PageVcode from './pages/Vcode';
import PageInput from './pages/Input';
import PageAuto from './pages/Auto';
import PageDownloading from './pages/Downloading';

export default [
  {
    path: '/',
    component: PageIndex,
  },
  {
    path: '/login',
    component: PageLogin,
  },
  {
    path: '/tasks',
    component: PageTasks,
  },
  {
    path: '/dirs',
    component: PageDirs,
  },
  {
    path: '/vcode',
    component: PageVcode,
  },
  {
    path: '/input',
    component: PageInput,
  },
  {
    path: '/auto',
    component: PageAuto,
  },
  {
    path: '/downloading',
    component: PageDownloading,
  },
];

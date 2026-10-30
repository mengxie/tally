import type { RouteObject } from 'react-router';
import { HomePage } from '../features/home/HomePage';
import { Layout } from './Layout';
import { NotFound, RouteError } from './RouteError';

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'groups/:groupId',
        // Code-split: the start page loads without the group screen's code.
        lazy: async () => ({ Component: (await import('../features/group/GroupPage')).GroupPage }),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
];

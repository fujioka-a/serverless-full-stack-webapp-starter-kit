export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Todo App</h2>
        <p className="mt-2 text-center text-sm text-gray-600">Create an account to start managing your tasks</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="flex flex-col items-center">
            <p className="mb-6 text-center text-sm text-gray-600">
              Create your Cognito account to access the Todo app
            </p>

            {/* Use <a> instead of <Link> to trigger a full-page navigation.
                The sign-up route returns a 302 redirect to Cognito, which
                would cause a CORS error if fetched via client-side navigation. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/api/auth/sign-up"
              // you can add a query string to change the locale of cognito managed login page.
              // href="/api/auth/sign-up?lang=ja"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign up with Cognito
            </a>

            <p className="mt-4 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/sign-in" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>

      <footer className="mt-8 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} Todo App. All rights reserved.</p>
      </footer>
    </div>
  );
}

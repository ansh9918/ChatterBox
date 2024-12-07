import { useState } from "react";
import { toast } from "react-toastify";
import supabase from "../../lib/supabase";
import upload from "../../lib/upload";
import imageCompression from "browser-image-compression";

const Login = () => {
  const [avatar, setAvatar] = useState({
    file: null,
    url: "",
  });
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const showRegister = () => setIsLogin(false);
  const showLogin = () => setIsLogin(true);
  const handleAvatar = async (e) => {
    try {
      // Original file
      const file = e.target.files[0];

      // Compression options
      const options = {
        maxSizeMB: 1, // Maximum file size in MB
        maxWidthOrHeight: 350, // Max width or height in pixels
        useWebWorker: true, // Use multi-threading (faster)
      };

      // Compress the file
      const compressedFile = await imageCompression(file, options);

      // Create a preview URL for the compressed image
      const compressedFileURL = URL.createObjectURL(compressedFile);

      setAvatar({
        file: compressedFile,
        url: compressedFileURL,
      });
    } catch (error) {
      console.error("Error compressing the image:", error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Extract form data
    const formData = new FormData(e.target);
    const { username, email, password } = Object.fromEntries(formData);

    // Validate inputs
    if (!username || !email || !password) {
      toast.warn("Please enter inputs!");
      setLoading(false);
      return;
    }
    if (!avatar.file) {
      toast.warn("Please upload an avatar!");
      setLoading(false);
      return;
    }

    // Check if username is unique
    const { data: existingUsers, error: usernameError } = await supabase
      .from("users")
      .select("*")
      .eq("username", username);

    if (usernameError) {
      toast.error("Error checking username!");
      setLoading(false);
      return;
    }
    if (existingUsers.length > 0) {
      toast.warn("Select another username");
      setLoading(false);
      return;
    }

    try {
      // Create user with Supabase authentication
      const { data: user, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      // Upload avatar image
      const imgUrl = await upload(avatar.file, user.user.id);

      // Insert user data into "users" table
      const { error: insertError } = await supabase.from("users").insert({
        id: user.user.id,
        username,
        email,
        avatar: imgUrl,
        blocked: [],
      });

      if (insertError) throw insertError;

      // Initialize userchats data
      const { error: initError } = await supabase.from("userchats").insert({
        id: user.user.id,
        chats: [],
      });

      if (initError) throw initError;

      toast.success("Account created! You can log in now!");
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const { email, password } = Object.fromEntries(formData);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Logged in successfully!");

      // You can redirect the user or handle successful login here
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-10 flex h-full w-full flex-col items-center justify-center gap-10 px-5 md:px-10 lg:my-0">
      <div className="mx-auto flex h-1/4 flex-col items-center justify-center gap-3 lg:h-auto">
        <h1 className="text-center text-2xl font-semibold lg:text-3xl">
          Welcome to ChatterBox
        </h1>
        <p>perfect place to chat !!</p>
      </div>
      <div className="hidden w-full flex-col items-center gap-10 md:flex-row md:justify-center lg:flex">
        {/* Sign In Section */}

        <div className="flex w-full transform flex-col items-center justify-center gap-5 transition-all duration-500 md:w-1/2">
          <h1 className="text-2xl font-bold tracking-wide">Welcome Back</h1>
          <form
            className="flex flex-col items-center justify-center gap-5"
            onSubmit={handleLogin}
          >
            <input
              type="email"
              name="email"
              placeholder="Enter email"
              className="w-full rounded-lg border-none bg-[rgb(17,25,40)]/50 p-2 px-3 outline-none"
            />
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              className="w-full rounded-lg border-none bg-[rgb(17,25,40)]/50 p-2 px-3 outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-500 p-2 text-center"
              disabled={loading}
            >
              {loading ? "Loading" : "Sign In"}
            </button>
          </form>
        </div>

        {/* Divider */}
        <div className="h-[80%] w-[2px] bg-slate-800"></div>

        {/* Register Section */}

        <div className="flex w-full flex-col items-center justify-center gap-5 md:w-1/2">
          <h1 className="text-2xl font-bold tracking-wide">
            Create an Account
          </h1>
          <form
            className="flex flex-col items-center justify-center gap-5"
            onSubmit={handleRegister}
          >
            <label
              htmlFor="avatar"
              className="flex items-center gap-5 underline"
            >
              <img
                src={avatar.url || "/assets/avatar.png"}
                alt=""
                className="h-12 w-12 rounded-lg object-cover"
              />
              Upload an Image
            </label>
            <input
              type="file"
              id="avatar"
              className="hidden"
              onChange={handleAvatar}
            />
            <input
              type="text"
              name="username"
              placeholder="Enter username"
              className="w-full rounded-lg border-none bg-[rgb(17,25,40)]/50 p-2 px-3 outline-none"
            />
            <input
              type="email"
              name="email"
              placeholder="Enter email"
              className="w-full rounded-lg border-none bg-[rgb(17,25,40)]/50 p-2 px-3 outline-none"
            />
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              className="w-full rounded-lg border-none bg-[rgb(17,25,40)]/50 p-2 px-3 outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-500 p-2 text-center"
              disabled={loading}
            >
              {loading ? "Loading" : "Sign Up"}
            </button>
          </form>
        </div>
      </div>
      <div className="flex h-3/4 w-full flex-col items-center gap-10 md:flex-row md:justify-center lg:hidden">
        <div className="flex gap-5">
          <button
            onClick={showLogin}
            className={`rounded px-4 py-2 ${isLogin ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          >
            Login
          </button>
          <button
            onClick={showRegister}
            className={`rounded px-4 py-2 ${!isLogin ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          >
            Register
          </button>
        </div>
        {/* Sign In Section */}
        {isLogin && (
          <div className="flex w-full transform flex-col items-center justify-center gap-5 transition-all duration-500 md:w-1/2">
            <h1 className="text-2xl font-bold tracking-wide">Welcome Back</h1>
            <form
              className="flex flex-col items-center justify-center gap-5"
              onSubmit={handleLogin}
            >
              <input
                type="email"
                name="email"
                placeholder="Enter email"
                className="w-full rounded-lg border-none bg-[rgb(17,25,40)]/50 p-2 px-3 outline-none"
              />
              <input
                type="password"
                name="password"
                placeholder="Enter password"
                className="w-full rounded-lg border-none bg-[rgb(17,25,40)]/50 p-2 px-3 outline-none"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-blue-500 p-2 text-center"
                disabled={loading}
              >
                {loading ? "Loading" : "Sign In"}
              </button>
            </form>
          </div>
        )}

        {/* Divider */}
        <div className="hidden h-[2px] w-full bg-slate-800 md:visible md:h-[80%] md:w-[2px]"></div>

        {/* Register Section */}

        {!isLogin && (
          <div className="flex w-full flex-col items-center justify-center gap-5 md:w-1/2">
            <h1 className="text-2xl font-bold tracking-wide">
              Create an Account
            </h1>
            <form
              className="flex flex-col items-center justify-center gap-5"
              onSubmit={handleRegister}
            >
              <label
                htmlFor="avatar"
                className="flex items-center gap-5 underline"
              >
                <img
                  src={avatar.url || "/assets/avatar.png"}
                  alt=""
                  className="h-12 w-12 rounded-lg object-cover"
                />
                Upload an Image
              </label>
              <input
                type="file"
                id="avatar"
                className="hidden"
                onChange={handleAvatar}
              />
              <input
                type="text"
                name="username"
                placeholder="Enter username"
                className="w-full rounded-lg border-none bg-[rgb(17,25,40)]/50 p-2 px-3 outline-none"
              />
              <input
                type="email"
                name="email"
                placeholder="Enter email"
                className="w-full rounded-lg border-none bg-[rgb(17,25,40)]/50 p-2 px-3 outline-none"
              />
              <input
                type="password"
                name="password"
                placeholder="Enter password"
                className="w-full rounded-lg border-none bg-[rgb(17,25,40)]/50 p-2 px-3 outline-none"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-blue-500 p-2 text-center"
                disabled={loading}
              >
                {loading ? "Loading" : "Sign Up"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;

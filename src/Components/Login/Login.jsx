import { useState } from "react";
import { toast } from "react-toastify";
import supabase from "../../lib/supabase";
import upload from "../../lib/upload";

const Login = () => {
  const [avatar, setAvatar] = useState({
    file: null,
    url: "",
  });
  const [loading, setLoading] = useState(false);
  const handleAvatar = (e) => {
    setAvatar({
      file: e.target.files[0],
      url: URL.createObjectURL(e.target.files[0]),
    });
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
      console.error(err);
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
      console.log(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex w-1/2 flex-col items-center justify-center gap-5">
        <h1 className="text-2xl font-bold tracking-wide">Welcome Back</h1>
        <form
          className="flex flex-col items-center justify-center gap-5"
          onSubmit={handleLogin}
        >
          <input
            type="email"
            name="email"
            placeholder="Enter email"
            className="rounded-lg border-none bg-[rgb(17,25,40)]/50 p-2 px-3 outline-none"
          />
          <input
            type="password"
            name="password"
            placeholder="Enter password"
            className="rounded-lg border-none bg-[rgb(17,25,40)]/50 p-2 px-3 outline-none"
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
      <div className="h-[80%] w-[2px] bg-slate-800"></div>
      <div className="flex w-1/2 flex-col items-center justify-center gap-5">
        <h1 className="text-2xl font-bold tracking-wide">Create an Account</h1>
        <form
          className="flex flex-col items-center justify-center gap-5"
          onSubmit={handleRegister}
        >
          <label htmlFor="avatar" className="flex items-center gap-5 underline">
            <img
              src={avatar.url || "./avatar.png"}
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
            className="rounded-lg border-none bg-[rgb(17,25,40)]/50 p-2 px-3 outline-none"
          />
          <input
            type="email"
            name="email"
            placeholder="Enter email"
            className="rounded-lg border-none bg-[rgb(17,25,40)]/50 p-2 px-3 outline-none"
          />
          <input
            type="password"
            name="password"
            placeholder="Enter password"
            className="rounded-lg border-none bg-[rgb(17,25,40)]/50 p-2 px-3 outline-none"
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
  );
};

export default Login;

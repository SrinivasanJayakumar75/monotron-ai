import { SignIn } from "@clerk/nextjs";

export const SignInView = () =>{
    return (
        <SignIn routing="hash"
         afterSignUpUrl="/conversations"
        redirectUrl="/conversations"/>
    );
};

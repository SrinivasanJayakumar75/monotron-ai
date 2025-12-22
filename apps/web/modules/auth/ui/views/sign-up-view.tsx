import { SignUp } from "@clerk/nextjs";

export const SignUpView = () =>{
    return (
        <SignUp routing="hash"
        afterSignUpUrl="/conversations"
        redirectUrl="/conversations"/>
    );
};

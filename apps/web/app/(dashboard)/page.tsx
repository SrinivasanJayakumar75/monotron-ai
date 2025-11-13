"use client";

import { OrganizationSwitcher, SignInButton, UserButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";
import {useMutation, useQuery} from "convex/react";
import {api} from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";


export default function Page() {
  const users = useQuery(api.users.getMany);
  const addUser = useMutation(api.users.add);
  return (
    <>
    {/* <Authenticated> */}
    <div className="flex items-center justify-center min-h-svh">
      <p>apps/web</p>
      <UserButton/>
      <OrganizationSwitcher hidePersonal/>
      <Button onClick={()=>addUser()}>Add</Button>

    </div>
    {/* </Authenticated>
    <Unauthenticated>
      <p>Must be signed in</p>
      <SignInButton>SignIn</SignInButton>
    </Unauthenticated> */}
    </>
  )
}

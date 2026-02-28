import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../lib/supabase";
import { soundManager } from "../utils/soundManager";
import { Send, Paperclip, Reply, X, Menu, LogOut, Smile, Plus, Users, MessageSquare } from "lucide-react";

const EMOJIS = [
  "😀", "😂", "🤣", "😊", "😍", "🤔", "🤨", "😐", "😑", "😶", "🙄", "😥", "😮", "🤐", "😯", "😪", "😫", "😴", "😌", "😛", "😜", "😝", "🤤", "😒", "😓", "😔", "😕", "🙃", "🤑", "😲", "☹️", "🙁", "😖", "😞", "😟", "😤", "😢", "😭", "😦", "😧", "😨", "😩", "🤯", "😬", "😰", "😱", "😳", "🤪", "😵", "😡", "😠", "🤬", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "😇", "🤠", "🤡", "🤥", "🤫", "🤭", "🧐", "🤓", "😈", "👿", "👹", "👺", "💀", "👻", "👽", "👾", "🤖", "💩", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "🙈", "🙉", "🙊", "💋", "💌", "💘", "💝", "💖", "💗", "💓", "💞", "💕", "💟", "❣️", "💔", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💯", "💢", "💥", "💫", "💦", "💨", "🕳️", "💣", "💬", "👁️‍🗨️", "🗨️", "🗯️", "💭", "💤"
];

interface Message {
  id: string;
  created_at: string;
  sender_id: string;
  content: string;
  file_url?: string;
  reply_to?: string;
  channel_id: string;
}

interface Channel {
  id: string;
  name: string;
  type: 'global' | 'direct' | 'group';
}

interface Sticker {
  id: string;
  url: string;
}

export default function Chat() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiTab, setEmojiTab] = useState<'emoji' | 'sticker'>('emoji');
  
  const [currentChannel, setCurrentChannel] = useState<Channel>({ id: 'global', name: 'Global Chat', type: 'global' });
  const [channels, setChannels] = useState<Channel[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [uploadingSticker, setUploadingSticker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    fetchMessages();
    fetchChannels();
    fetchStickers();

    const msgSub = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.channel_id === currentChannel.id || (!newMsg.channel_id && currentChannel.id === 'global')) {
            setMessages((prev) => [...prev, newMsg]);
          }
          if (newMsg.sender_id !== user.username) {
            soundManager.play("pop");
          }
        },
      )
      .subscribe();

    const channelSub = supabase
      .channel("public:channels")
      .on("postgres_changes", { event: "*", schema: "public", table: "channels" }, () => {
        fetchChannels();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgSub);
      supabase.removeChannel(channelSub);
    };
  }, [user, navigate, currentChannel.id]);

  const fetchChannels = async () => {
    const { data: memberData } = await supabase
      .from('channel_members')
      .select('channel_id')
      .eq('user_id', user?.username);
      
    const channelIds = ['global', ...(memberData?.map(m => m.channel_id) || [])];
    
    const { data: channelData } = await supabase
      .from('channels')
      .select('*')
      .in('id', channelIds);
      
    if (channelData) {
      setChannels(channelData);
    }
  };

  const fetchStickers = async () => {
    const { data } = await supabase.from('user_stickers').select('*').eq('user_id', user?.username);
    if (data) setStickers(data);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq('channel_id', currentChannel.id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Error fetching messages:", error);
    } else {
      setMessages(data || []);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;

    soundManager.play("sounds_button");

    const msgData = {
      sender_id: user?.username,
      content: newMessage.trim(),
      reply_to: replyingTo?.id || null,
      channel_id: currentChannel.id,
    };

    const { error } = await supabase.from("messages").insert([msgData]);

    if (error) {
      console.error("Error sending message:", error);
      soundManager.play("toast"); // Error sound
    } else {
      setNewMessage("");
      setReplyingTo(null);
      setShowEmojiPicker(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundManager.play("sounds_click");
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      // Use a simple hash or base64 for the username to ensure it's purely alphanumeric
      // btoa handles ASCII, so we encodeURIComponent first to handle Chinese characters
      const safeUsername = btoa(encodeURIComponent(user?.username || "unknown")).replace(/[^a-zA-Z0-9]/g, '');
      const filePath = `${safeUsername}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("chat_files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("chat_files").getPublicUrl(filePath);

      const msgData = {
        sender_id: user?.username,
        content: `Sent a file: ${file.name}`,
        file_url: publicUrl,
        reply_to: replyingTo?.id || null,
        channel_id: currentChannel.id,
      };

      const { error: dbError } = await supabase
        .from("messages")
        .insert([msgData]);
      if (dbError) throw dbError;

      soundManager.play("pop");
    } catch (error) {
      console.error("Error uploading file:", error);
      soundManager.play("toast");
    } finally {
      setUploading(false);
      setReplyingTo(null);
    }
  };

  const toggleDrawer = () => {
    soundManager.play(
      isDrawerOpen ? "sounds_drawer_close" : "sounds_drawer_open",
    );
    setIsDrawerOpen(!isDrawerOpen);
  };

  const handleLogout = () => {
    soundManager.play("sounds_button");
    logout();
    navigate("/");
  };

  const handleCreateDM = async () => {
    const targetUser = prompt("Enter username to DM:");
    if (!targetUser || targetUser === user?.username) return;
    
    soundManager.play("sounds_click");
    const dmId = `dm_${[user?.username, targetUser].sort().join('_')}`;
    
    const { data: existing } = await supabase.from('channels').select('*').eq('id', dmId).single();
    if (!existing) {
      await supabase.from('channels').insert([{ id: dmId, name: `DM: ${user?.username} & ${targetUser}`, type: 'direct', created_by: user?.username }]);
      await supabase.from('channel_members').insert([
        { channel_id: dmId, user_id: user?.username },
        { channel_id: dmId, user_id: targetUser }
      ]);
    }
    
    setCurrentChannel({ id: dmId, name: targetUser, type: 'direct' });
    setIsDrawerOpen(false);
  };

  const handleCreateGroup = async () => {
    const groupName = prompt("Enter group name:");
    if (!groupName) return;
    
    soundManager.play("sounds_click");
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await supabase.from('channels').insert([{ id: groupId, name: groupName, type: 'group', created_by: user?.username }]);
    await supabase.from('channel_members').insert([{ channel_id: groupId, user_id: user?.username }]);
    
    setCurrentChannel({ id: groupId, name: groupName, type: 'group' });
    setIsDrawerOpen(false);
  };

  const handleJoinGroup = async () => {
    const groupId = prompt("Enter Group ID to join:");
    if (!groupId) return;
    
    soundManager.play("sounds_click");
    const { data: existing } = await supabase.from('channels').select('*').eq('id', groupId).eq('type', 'group').single();
    if (existing) {
      await supabase.from('channel_members').insert([{ channel_id: groupId, user_id: user?.username }]);
      fetchChannels();
      setCurrentChannel(existing);
      setIsDrawerOpen(false);
    } else {
      alert("Group not found!");
    }
  };

  const handleUploadSticker = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    soundManager.play("sounds_click");
    setUploadingSticker(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const safeUsername = btoa(encodeURIComponent(user?.username || "unknown")).replace(/[^a-zA-Z0-9]/g, '');
      const filePath = `stickers/${safeUsername}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("chat_files").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("chat_files").getPublicUrl(filePath);

      await supabase.from('user_stickers').insert([{ user_id: user?.username, url: publicUrl }]);
      fetchStickers();
      soundManager.play("pop");
    } catch (error) {
      console.error(error);
      soundManager.play("toast");
    } finally {
      setUploadingSticker(false);
    }
  };

  const handleSendSticker = async (url: string) => {
    soundManager.play("sounds_button");
    const msgData = {
      sender_id: user?.username,
      content: "[Sticker]",
      file_url: url,
      reply_to: replyingTo?.id || null,
      channel_id: currentChannel.id
    };
    await supabase.from("messages").insert([msgData]);
    setShowEmojiPicker(false);
    setReplyingTo(null);
  };

  return (
    <div className="flex h-screen bg-ore-bg text-ore-text font-mc-seven overflow-hidden">
      {/* Sidebar / Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-ore-panel border-r-4 border-ore-border transform transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0 flex flex-col`}
      >
        <div className="p-4 border-b-4 border-ore-border flex justify-between items-center bg-ore-bg">
          <h2 className="font-mc-five text-xl text-ore-green">MENU</h2>
          <button
            onClick={toggleDrawer}
            className="md:hidden text-ore-text-muted hover:text-white"
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="mb-6">
            <h3 className="font-mc-five text-sm text-ore-text-muted mb-2">
              CURRENT USER
            </h3>
            <div className="flex items-center space-x-2 bg-ore-bg p-2 border-2 border-ore-border">
              <div className="w-8 h-8 bg-ore-green border-2 border-ore-border flex items-center justify-center font-mc-five">
                {user?.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-mc-ae text-sm">{user?.username}</div>
                <div className="text-xs text-ore-text-muted">{user?.role}</div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-mc-five text-sm text-ore-text-muted mb-2">
              CHANNELS
            </h3>
            <div className="space-y-1">
              {channels.map(channel => (
                <div 
                  key={channel.id}
                  onClick={() => {
                    soundManager.play("sounds_click");
                    setCurrentChannel(channel);
                    if (window.innerWidth < 768) setIsDrawerOpen(false);
                  }}
                  className={`p-2 border-2 text-sm font-mc-five cursor-pointer truncate ${currentChannel.id === channel.id ? 'bg-ore-green/20 border-ore-green text-ore-green' : 'bg-ore-bg border-ore-border text-ore-text-muted hover:text-white'}`}
                >
                  {channel.type === 'global' && '# '}
                  {channel.type === 'direct' && '@ '}
                  {channel.type === 'group' && '👥 '}
                  {channel.type === 'direct' ? channel.name.replace(`DM: ${user?.username} & `, '').replace(` & ${user?.username}`, '') : channel.name}
                </div>
              ))}
            </div>
            
            <div className="mt-4 space-y-2">
              <button onClick={handleCreateDM} className="ore-btn w-full py-2 text-xs flex items-center justify-center space-x-1">
                <Users size={14} />
                <span>NEW DM</span>
              </button>
              <button onClick={handleCreateGroup} className="ore-btn w-full py-2 text-xs flex items-center justify-center space-x-1">
                <Plus size={14} />
                <span>CREATE GROUP</span>
              </button>
              <button onClick={handleJoinGroup} className="ore-btn w-full py-2 text-xs flex items-center justify-center space-x-1">
                <MessageSquare size={14} />
                <span>JOIN GROUP</span>
              </button>
            </div>
          </div>
        </div>
        <div className="p-4 border-t-4 border-ore-border">
          <button
            onClick={handleLogout}
            className="ore-btn w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700"
          >
            <LogOut size={18} />
            <span>LOGOUT</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div
        className="flex-1 flex flex-col h-full bg-[url('/images/stone_background.png')] bg-repeat bg-center"
        style={{ imageRendering: "pixelated" }}
      >
        {/* Header */}
        <header className="bg-ore-panel border-b-4 border-ore-border p-4 flex items-center shadow-md z-10">
          <button
            onClick={toggleDrawer}
            className="md:hidden mr-4 text-ore-text hover:text-ore-green transition-colors"
          >
            <Menu size={24} />
          </button>
          <h1 className="font-mc-ten text-2xl text-white tracking-wider drop-shadow-md truncate">
            {currentChannel.type === 'global' && 'GLOBAL CHAT'}
            {currentChannel.type === 'direct' && `DM: ${currentChannel.name.replace(`DM: ${user?.username} & `, '').replace(` & ${user?.username}`, '')}`}
            {currentChannel.type === 'group' && `GROUP: ${currentChannel.name}`}
          </h1>
        </header>

        {/* Messages */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4"
          onClick={() => setShowEmojiPicker(false)}
        >
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.username;
            const replyMsg = msg.reply_to
              ? messages.find((m) => m.id === msg.reply_to)
              : null;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div className="flex items-baseline space-x-2 mb-1 px-1">
                  <span className="font-mc-five text-sm text-ore-text-muted">
                    {msg.sender_id}
                  </span>
                  <span className="text-xs text-ore-text-muted opacity-50">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div
                  className={`max-w-[80%] ore-panel p-3 relative group ${isMe ? "bg-ore-green/20 border-ore-green/50" : "bg-ore-panel"}`}
                >
                  {replyMsg && (
                    <div className="mb-2 p-2 bg-black/20 border-l-4 border-ore-green text-sm opacity-80 rounded-sm">
                      <div className="font-mc-five text-xs text-ore-green mb-1">
                        {replyMsg.sender_id}
                      </div>
                      <div className="font-mc-ae truncate">
                        {replyMsg.content}
                      </div>
                    </div>
                  )}

                  {msg.content !== "[Sticker]" && (
                    <div className="font-mc-ae text-white whitespace-pre-wrap break-words">
                      {msg.content}
                    </div>
                  )}

                  {msg.file_url && (
                    <div className={msg.content === "[Sticker]" ? "" : "mt-2"}>
                      {msg.content === "[Sticker]" || msg.file_url.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i) ? (
                        <img
                          src={msg.file_url}
                          alt="attachment"
                          className="max-w-full h-auto border-2 border-ore-border rounded-sm"
                          style={msg.content === "[Sticker]" ? { maxHeight: '150px' } : {}}
                        />
                      ) : (
                        <a
                          href={msg.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ore-green hover:underline flex items-center space-x-1 font-mc-five text-sm bg-black/20 p-2 border border-ore-border"
                        >
                          <Paperclip size={14} />
                          <span>DOWNLOAD FILE</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Reply Button (Hover) */}
                  <button
                    onClick={() => {
                      soundManager.play("sounds_click");
                      setReplyingTo(msg);
                    }}
                    className={`absolute top-2 ${isMe ? "-left-8" : "-right-8"} opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-ore-panel border border-ore-border rounded hover:bg-ore-border-light`}
                    title="Reply"
                  >
                    <Reply size={16} className="text-ore-text" />
                  </button>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-ore-panel border-t-4 border-ore-border p-4">
          {replyingTo && (
            <div className="mb-2 flex items-center justify-between bg-black/20 p-2 border-l-4 border-ore-green">
              <div className="flex flex-col">
                <span className="font-mc-five text-xs text-ore-green">
                  Replying to {replyingTo.sender_id}
                </span>
                <span className="font-mc-ae text-sm text-ore-text-muted truncate max-w-md">
                  {replyingTo.content}
                </span>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-ore-text-muted hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <form
            onSubmit={handleSendMessage}
            className="flex items-end space-x-2 relative"
          >
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-2 bg-ore-panel border-4 border-ore-border p-2 w-72 h-64 flex flex-col z-50 shadow-lg">
                <div className="flex space-x-2 mb-2 border-b-2 border-ore-border pb-2">
                  <button 
                    type="button"
                    onClick={() => { soundManager.play("sounds_click"); setEmojiTab('emoji'); }}
                    className={`font-mc-five text-sm px-2 py-1 ${emojiTab === 'emoji' ? 'text-ore-green bg-black/20' : 'text-ore-text-muted hover:text-white'}`}
                  >
                    EMOJIS
                  </button>
                  <button 
                    type="button"
                    onClick={() => { soundManager.play("sounds_click"); setEmojiTab('sticker'); }}
                    className={`font-mc-five text-sm px-2 py-1 ${emojiTab === 'sticker' ? 'text-ore-green bg-black/20' : 'text-ore-text-muted hover:text-white'}`}
                  >
                    STICKERS
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {emojiTab === 'emoji' ? (
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJIS.map((emoji, index) => (
                        <button
                          key={index}
                          type="button"
                          className="text-xl hover:bg-ore-border-light p-1 rounded transition-colors"
                          onClick={() => {
                            soundManager.play("sounds_click");
                            setNewMessage((prev) => prev + emoji);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col h-full">
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        {stickers.map(sticker => (
                          <button
                            key={sticker.id}
                            type="button"
                            className="aspect-square border-2 border-ore-border hover:border-ore-green bg-black/20 flex items-center justify-center p-1"
                            onClick={() => handleSendSticker(sticker.url)}
                          >
                            <img src={sticker.url} alt="sticker" className="max-w-full max-h-full object-contain" />
                          </button>
                        ))}
                      </div>
                      <div className="mt-auto pt-2 border-t-2 border-ore-border">
                        <input
                          type="file"
                          id="sticker-upload"
                          className="hidden"
                          accept="image/*"
                          onChange={handleUploadSticker}
                          disabled={uploadingSticker}
                        />
                        <label
                          htmlFor="sticker-upload"
                          className={`ore-btn w-full py-2 text-xs flex items-center justify-center space-x-1 cursor-pointer ${uploadingSticker ? 'opacity-50' : ''}`}
                          onClick={() => soundManager.play("sounds_click")}
                        >
                          <Plus size={14} />
                          <span>{uploadingSticker ? 'UPLOADING...' : 'ADD STICKER'}</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="relative">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <label
                htmlFor="file-upload"
                className={`ore-btn flex items-center justify-center p-3 cursor-pointer ${uploading ? "opacity-50" : ""}`}
                title="Upload File"
                onClick={() => soundManager.play("sounds_click")}
              >
                <Paperclip size={20} />
              </label>
            </div>

            <button
              type="button"
              className="ore-btn flex items-center justify-center p-3"
              title="Emojis"
              onClick={() => {
                soundManager.play("sounds_click");
                setShowEmojiPicker(!showEmojiPicker);
              }}
            >
              <Smile size={20} />
            </button>

            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                } else {
                  soundManager.play("sounds_click");
                }
              }}
              placeholder="Type a message..."
              className="ore-input flex-1 py-3"
              disabled={uploading}
              onClick={() => setShowEmojiPicker(false)}
            />

            <button
              type="submit"
              disabled={!newMessage.trim() || uploading}
              className="ore-btn p-3 flex items-center justify-center disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
